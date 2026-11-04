import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { trackJourney } from "@/lib/journey-tracking";

interface CartItem {
  id: string;
  course_id: string;
  course: {
    id: string;
    title: string;
    price: number;
    discount_price?: number | null;
    is_published?: boolean;
    thumbnail_url: string | null;
    instructor: { name: string } | null;
  };
}

interface CartContextType {
  items: CartItem[];
  count: number;
  total: number;
  loading: boolean;
  addToCart: (courseId: string) => Promise<void>;
  removeFromCart: (courseId: string) => Promise<void>;
  isInCart: (courseId: string) => boolean;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select("id, course_id, course:courses(id, title, price, discount_price, is_published, thumbnail_url, instructor:instructors(name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Courses that are no longer on sale cannot be charged, so drop them from the cart.
      const unavailable = data.filter((item: any) => {
        const c = Array.isArray(item.course) ? item.course[0] : item.course;
        return !c || c.is_published === false;
      });
      if (unavailable.length > 0) {
        await supabase.from("cart_items").delete().in("id", unavailable.map((i: any) => i.id));
        toast({ title: "Cart updated", description: `${unavailable.length} course${unavailable.length > 1 ? "s are" : " is"} no longer available and ${unavailable.length > 1 ? "were" : "was"} removed.` });
      }
      const available = data.filter((item: any) => !unavailable.includes(item));
      setItems(
        available.map((item: any) => ({
          ...item,
          course: {
            ...( Array.isArray(item.course) ? item.course[0] : item.course ),
            instructor: Array.isArray(item.course?.instructor ?? item.course?.[0]?.instructor)
              ? (item.course?.instructor ?? item.course?.[0]?.instructor)?.[0] ?? null
              : (item.course?.instructor ?? null),
          },
        }))
      );
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (courseId: string) => {
    if (!user) return;
    const { error } = await supabase.from("cart_items").insert({ user_id: user.id, course_id: courseId });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already in cart", variant: "destructive" });
      } else {
        toast({ title: "Failed to add to cart", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Added to cart!" });
    void trackJourney("cart_added");
    await fetchCart();
  };

  const removeFromCart = async (courseId: string) => {
    if (!user) return;
    const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id).eq("course_id", courseId);
    if (!error) void trackJourney("cart_removed");
    await fetchCart();
  };

  const clearCart = async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    setItems([]);
  };

  const isInCart = (courseId: string) => items.some((i) => i.course_id === courseId);

  return (
    <CartContext.Provider
      value={{
        items,
        count: items.length,
        total: items.reduce((s, i) => s + Number(i.course?.price ?? 0), 0),
        loading,
        addToCart,
        removeFromCart,
        isInCart,
        clearCart,
        refresh: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

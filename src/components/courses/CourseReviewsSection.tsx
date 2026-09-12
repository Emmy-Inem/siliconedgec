import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { COURSE_DETAIL_FAQS } from "./courseFaqs";

interface ReviewProfile {
  full_name?: string | null;
  avatar_url?: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: ReviewProfile | null;
}

interface CourseReviewsSectionProps {
  isEnrolled: boolean;
  reviews: Review[];
  reviewCount: number;
  userReview: { rating: number; comment: string | null } | null | undefined;
  isSubmittingReview: boolean;
  onSubmitReview: (rating: number, comment: string) => void;
}

export function CourseReviewsSection({
  isEnrolled,
  reviews,
  reviewCount,
  userReview,
  isSubmittingReview,
  onSubmitReview,
}: CourseReviewsSectionProps) {
  const [reviewRating, setReviewRating] = useState(userReview?.rating ?? 5);
  const [reviewComment, setReviewComment] = useState(userReview?.comment ?? "");
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (userReview) {
      setReviewRating(userReview.rating ?? 5);
      setReviewComment(userReview.comment ?? "");
    }
  }, [userReview]);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold">Reviews ({reviewCount})</h2>

      {/* Write/Edit Review (only for enrolled users) */}
      {isEnrolled && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-heading font-semibold text-sm">
            {userReview ? "Update Your Review" : "Write a Review"}
          </h3>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setReviewRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= (hoverRating || reviewRating)
                      ? "fill-accent text-accent"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
            <span className="text-sm text-muted-foreground ml-2">{reviewRating}/5</span>
          </div>
          <Textarea
            placeholder="Share your experience with this course..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3}
          />
          <Button
            size="sm"
            type="button"
            onClick={() => onSubmitReview(reviewRating, reviewComment)}
            disabled={isSubmittingReview}
          >
            {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {userReview ? "Update Review" : "Submit Review"}
          </Button>
        </div>
      )}

      {/* Review List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {review.profile?.avatar_url ? (
                    <img
                      src={review.profile.avatar_url}
                      alt={`${review.profile?.full_name ?? "Student"} profile photo`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      {(review.profile?.full_name ?? "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{review.profile?.full_name ?? "Student"}</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < review.rating ? "fill-accent text-accent" : "text-muted-foreground/20"}`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">No reviews yet. Be the first to review this course!</p>
      )}

      {/* Course FAQ Section for User Confidence & Search Rich Snippets */}
      <div className="pt-8 border-t border-border mt-8">
        <h2 className="font-heading font-bold text-xl mb-4">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {COURSE_DETAIL_FAQS.map((faq, idx) => (
            <AccordionItem key={idx} value={`course-faq-${idx}`}>
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

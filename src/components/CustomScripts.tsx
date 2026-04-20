import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/**
 * Injects admin-defined custom scripts into <head> and end of <body>.
 * Allows adding GA, Meta Pixel, custom analytics without touching index.html.
 */
export function CustomScripts() {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;

    const headScript = settings.custom_head_script;
    const bodyScript = settings.custom_body_script;
    const injected: HTMLElement[] = [];

    const inject = (html: string | undefined, where: HTMLElement, marker: string) => {
      if (!html) return;
      const wrapper = document.createElement("div");
      wrapper.dataset.injected = marker;
      wrapper.innerHTML = html;
      // Re-create script tags so they execute
      Array.from(wrapper.querySelectorAll("script")).forEach((old) => {
        const fresh = document.createElement("script");
        Array.from(old.attributes).forEach(a => fresh.setAttribute(a.name, a.value));
        fresh.text = old.text;
        old.replaceWith(fresh);
      });
      while (wrapper.firstChild) {
        const node = wrapper.firstChild as HTMLElement;
        where.appendChild(node);
        injected.push(node);
      }
    };

    inject(headScript as string | undefined, document.head, "head");
    inject(bodyScript as string | undefined, document.body, "body");

    return () => {
      injected.forEach(n => n.remove());
    };
  }, [settings?.custom_head_script, settings?.custom_body_script]);

  return null;
}

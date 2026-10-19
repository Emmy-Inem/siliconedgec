import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { isPrivateSearchPage } from "@/lib/search-policy";

/** Covers private routes even when their page does not mount SEO. */
export function RouteIndexing() {
  const { pathname } = useLocation();
  return isPrivateSearchPage(pathname)
    ? <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    : null;
}
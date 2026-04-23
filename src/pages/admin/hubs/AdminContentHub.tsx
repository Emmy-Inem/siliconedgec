import { HubShell } from "./HubShell";
import AdminHomeContent from "../AdminHomeContent";
import AdminSiteContent from "../AdminSiteContent";
import AdminPages from "../AdminPages";
import AdminBlog from "../AdminBlog";
import AdminTestimonials from "../AdminTestimonials";
import AdminMedia from "../AdminMedia";

export default function AdminContentHub() {
  return (
    <HubShell
      title="Content"
      description="Home page, site copy, blog, pages and media"
      tabs={[
        { value: "home", label: "Home Page", content: <AdminHomeContent /> },
        { value: "site", label: "Site Content", content: <AdminSiteContent /> },
        { value: "pages", label: "Pages", content: <AdminPages /> },
        { value: "blog", label: "Blog", content: <AdminBlog /> },
        { value: "testimonials", label: "Testimonials", content: <AdminTestimonials /> },
        { value: "media", label: "Media Library", content: <AdminMedia /> },
      ]}
    />
  );
}
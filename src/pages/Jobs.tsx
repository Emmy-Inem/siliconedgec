import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useJobs } from "@/hooks/useJobs";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Clock, Search, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const { data: jobs = [], isLoading } = useJobs({ search, type, remote: remoteOnly });
  const { format: formatPrice } = useLocalizedPrice();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Tech Jobs Board | Silicon Edge Consulting"
        description="Discover curated tech roles in AI, Cloud, DevOps and more. Apply directly through Silicon Edge Consulting."
      />
      <Header />

      <section className="pt-28 pb-12 bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Career opportunities
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mt-4">Land your next tech role<span className="text-gold">.</span></h1>
            <p className="text-muted-foreground mt-4 text-lg">Curated jobs from our hiring partners — exclusively for the Silicon Edge community.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, company, location"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-sm cursor-pointer">
              <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="rounded" />
              Remote only
            </label>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-muted-foreground">Loading jobs…</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20">
              <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">No jobs match your filters right now. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={`/jobs/${job.id}`}
                    className="block p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-heading font-semibold text-lg group-hover:text-primary transition-colors">{job.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
                      </div>
                      {job.is_remote && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                          <Wifi className="h-3 w-3" /> Remote
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.job_type}</span>
                      {(job.salary_min || job.salary_max) && (
                        <span className="text-foreground font-medium">
                          {job.salary_min ? formatPrice(Number(job.salary_min)) : ""}
                          {job.salary_min && job.salary_max ? " – " : ""}
                          {job.salary_max ? formatPrice(Number(job.salary_max)) : ""}
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

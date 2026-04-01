"use client";

import * as React from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ArticleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tag: string;
  date: {
    month: string;
    day: number;
  };
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  location: {
    city: string;
    country: string;
  };
}

const ArticleCard = React.forwardRef<HTMLDivElement, ArticleCardProps>(
  (
    {
      className,
      tag,
      date,
      title,
      description,
      imageUrl,
      imageAlt,
      location,
    },
    ref
  ) => {
    const shouldBypassOptimization = (() => {
      try {
        const hostname = new URL(imageUrl).hostname;
        return ![
          "drive.google.com",
          "lh3.googleusercontent.com",
          "docs.googleusercontent.com",
          process.env.NEXT_PUBLIC_SUPABASE_URL
            ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
            : "",
        ].includes(hostname);
      } catch {
        return true;
      }
    })();

    return (
      <div
        ref={ref}
        className={cn(
          "group w-full overflow-hidden rounded-2xl border border-cyan-200/10 bg-[#0a0f1c]/90 text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_28px_64px_rgba(0,0,0,0.38)]",
          className
        )}
      >
        <div className="border-b border-white/6 p-5 sm:p-6">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-xs font-medium text-cyan-100">
              {tag}
            </span>
            <div className="flex items-center text-xs font-semibold">
              <span className="rounded-l-md border border-r-0 border-white/8 bg-slate-800 px-2.5 py-1.5 text-slate-300">
                {date.month.toUpperCase()}
              </span>
              <span className="rounded-r-md border border-cyan-300/12 bg-cyan-300/14 px-2.5 py-1.5 text-cyan-100">
                {date.day}
              </span>
            </div>
          </header>

          <main className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">{title}</h3>
            <p className="text-sm leading-relaxed text-slate-400">{description}</p>
          </main>
        </div>

        <div className="relative mt-0 aspect-[16/10] overflow-hidden rounded-b-2xl rounded-t-none">
          <div className="relative h-full w-full overflow-hidden">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized={shouldBypassOptimization}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 flex items-center gap-2 p-4 text-white">
            <MapPin className="h-4 w-4" />
            <div>
              <p className="text-sm font-semibold">{location.city}</p>
              <p className="text-xs text-white/80">{location.country}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ArticleCard.displayName = "ArticleCard";

export { ArticleCard };

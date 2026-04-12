"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Github, Linkedin, Mail, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

type RoleAppearance = {
  label: string;
  class: string;
};

export function TeamSection({
  profiles,
  roleMap,
}: {
  profiles: Profile[];
  roleMap: Record<string, RoleAppearance>;
}) {
  const router = useRouter();

  return (
    <div className="hidden gap-6 pb-24 lg:grid lg:grid-cols-3 xl:grid-cols-4">
      {profiles.map((profile, index) => {
        const role = roleMap[profile.role] ?? roleMap.member;

        return (
          <motion.div
            key={profile.id}
            layout
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, delay: index * 0.02 }}
            className="h-full"
            onClick={() => router.push(`/profile/${profile.id}`)}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/profile/${profile.id}`);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="h-full min-h-[380px] w-full overflow-hidden rounded-lg border border-white/10 bg-[#0a0f1c]/95 p-[1px] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
              <div className="relative flex h-full flex-col items-center rounded-lg bg-[radial-gradient(circle_at_top,rgba(0,229,255,0.08),rgba(10,15,28,0.98)_42%,rgba(7,10,18,1))] px-6 py-7 text-center">
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />

                <div className="mb-5 flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-slate-500/40 shadow-xl">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-10 w-10 text-primary-light/50" />
                  )}
                </div>

                <h3 className="max-w-full text-xl font-bold tracking-tight text-white">
                  <span className="block truncate">{profile.display_name}</span>
                </h3>

                <span
                  className={`mt-3 inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] shadow-sm ${role.class}`}
                >
                  <span className="truncate">{role.label}</span>
                </span>

                <div className="mt-6 flex min-h-[40px] items-center">
                  {profile.contact_email ? (
                    <a
                      href={`mailto:${profile.contact_email}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex max-w-full items-center gap-2 text-xs text-slate-400 transition-colors hover:text-cyan-100"
                    >
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{profile.contact_email}</span>
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      <span>No contact email</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-4 pt-8">
                  {profile.github_url ? (
                    <a
                      href={profile.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                      title="GitHub"
                    >
                      <Github className="h-4.5 w-4.5" />
                    </a>
                  ) : null}

                  {profile.linkedin_url ? (
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition-all hover:border-[#0A66C2]/35 hover:bg-[#0A66C2]/10 hover:text-[#7ab8ff]"
                      title="LinkedIn"
                    >
                      <Linkedin className="h-4.5 w-4.5" />
                    </a>
                  ) : null}

                  {!profile.github_url && !profile.linkedin_url ? (
                    <div className="rounded-full border border-dashed border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      No social links
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

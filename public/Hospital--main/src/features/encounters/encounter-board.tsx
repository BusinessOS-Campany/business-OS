"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PlayIcon,
  ArrowRightIcon,
  StethoscopeIcon,
  Volume2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import { startEncounterAction } from "@/actions/encounters";

type Ticket = {
  id: string;
  ticketNo: string;
  status: string;
  patient: { id: string; mrn: string; nameAr: string; nameEn: string };
  department?: { id: string; nameAr: string; nameEn: string } | null;
  appointment?: {
    id: string;
    appointmentNo: string;
    doctor?: { id: string; nameAr: string; nameEn: string } | null;
    encounter?: { id: string; encounterNo: string } | null;
  } | null;
};

type EncounterRow = {
  id: string;
  encounterNo: string;
  status: string;
  createdById?: string | null;
  patient: { id: string; mrn: string; nameAr: string; nameEn: string };
  doctor?: { id: string; nameAr: string; nameEn: string } | null;
  department?: { id: string; nameAr: string; nameEn: string } | null;
};

export function EncounterBoard({
  tickets,
  encounters,
  locale,
}: {
  tickets: Ticket[];
  encounters: EncounterRow[];
  locale: string;
}) {
  const t = useTranslations("encounters");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const nameOf = (p: { nameAr: string; nameEn: string }) => (locale === "ar" ? p.nameAr : p.nameEn);

  const start = (ticket: Ticket) => {
    startTransition(async () => {
      const res = await startEncounterAction(
        ticket.id,
        ticket.patient.id,
        ticket.appointment?.id ?? null,
        ticket.department?.id ?? null,
        null
      );
      if (res?.ok && res.data?.id) {
        router.push(`/encounters/${res.data.id}`);
      } else if (res?.ok === false && res.error) {
        if (res.error === "encounters.alreadyStarted" && ticket.appointment?.encounter?.id) {
          router.push(`/encounters/${ticket.appointment.encounter.id}`);
        } else {
          toast.error(t(res.error));
        }
      } else {
        toast.error(tc("error"));
      }
    });
  };

  const startable = tickets.filter(
    (tk) => !(tk.appointment?.encounter?.id)
  );
  const alreadyStarted = tickets.filter((tk) => Boolean(tk.appointment?.encounter?.id));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2Icon className="size-4 text-primary" />
            {t("start")} · {startable.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {startable.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("noOpenTickets")}
            </div>
          ) : (
            <ul className="divide-y">
              {startable.map((ticket) => (
                <li key={ticket.id} className="flex items-center gap-3 py-2.5">
                  <span className="font-mono text-sm font-semibold tabular-nums">{ticket.ticketNo}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/patients/${ticket.patient.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar className="size-8">
                        <AvatarFallback>{initials(nameOf(ticket.patient))}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{nameOf(ticket.patient)}</p>
                        <p className="truncate text-xs text-muted-foreground tabular-nums">{ticket.patient.mrn}</p>
                      </div>
                    </Link>
                    {ticket.appointment?.doctor ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t("doctorLabel")}: {nameOf(ticket.appointment.doctor)}
                      </p>
                    ) : null}
                  </div>
                  <Button size="sm" className="gap-1.5" disabled={isPending} onClick={() => start(ticket)}>
                    <PlayIcon className="size-3.5" />
                    {t("start")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <StethoscopeIcon className="size-4 text-primary" />
            {t("activeEncounter")} · {encounters.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {encounters.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("noOpenTickets")}
            </div>
          ) : (
            <ul className="divide-y">
              {encounters.map((enc) => (
                <li key={enc.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{nameOf(enc.patient)}</p>
                      <Badge variant="default">{enc.encounterNo}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">{enc.patient.mrn}</p>
                  </div>
                  <Button asChild size="sm" variant="secondary" className="gap-1.5">
                    <Link href={`/encounters/${enc.id}`}>
                      {t("continue")}
                      <ArrowRightIcon className="size-3.5 rtl:rotate-180" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {alreadyStarted.length > 0 ? (
            <div className="mt-3 border-t pt-3">
              <p className="mb-2 text-xs text-muted-foreground">{t("alreadyStarted")}</p>
              <ul className="space-y-1.5">
                {alreadyStarted.map((ticket) => {
                  const enc = ticket.appointment?.encounter;
                  return (
                    <li key={ticket.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-mono text-xs tabular-nums">{ticket.ticketNo}</span>
                      <span className="min-w-0 flex-1 truncate">{nameOf(ticket.patient)}</span>
                      {enc ? (
                        <Link href={`/encounters/${enc.id}`} className="text-xs font-medium text-primary hover:underline">
                          {enc.encounterNo}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
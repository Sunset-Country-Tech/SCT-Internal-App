import { NextResponse } from "next/server";
import { z } from "zod";
import {
  appointments,
  customers,
  invoices,
  jobs,
  quotes,
} from "@/lib/operations-data";
import { prisma } from "@/lib/server/db";

export const runtime = "nodejs";

const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  area: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const jobSchema = z.object({
  number: z.string().min(1),
  customer: z.string().min(1),
  type: z.string().min(1),
  device: z.string().optional(),
  status: z.string().min(1),
  due: z.string().optional(),
  next: z.string().min(1),
});

const quoteSchema = z.object({
  number: z.string().min(1),
  token: z.string().min(8),
  customer: z.string().min(1),
  job: z.string().optional(),
  status: z.string().min(1),
  expiry: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number(),
    unitPrice: z.number(),
    taxRate: z.number(),
  })),
});

const appointmentSchema = z.object({
  time: z.string().min(1),
  type: z.string().min(1),
  customer: z.string().optional(),
  location: z.string().optional(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create-customer"), customer: customerSchema }),
  z.object({ action: z.literal("create-job"), job: jobSchema }),
  z.object({ action: z.literal("create-quote"), quote: quoteSchema }),
  z.object({ action: z.literal("create-appointment"), appointment: appointmentSchema }),
  z.object({ action: z.literal("record-payment"), invoiceNumber: z.string().min(1), amount: z.number().positive() }),
  z.object({ action: z.literal("complete-job"), jobNumber: z.string().min(1) }),
  z.object({ action: z.literal("draft-workflow"), title: z.string().min(1), detail: z.string().min(1) }),
]);

type DbCustomer = {
  customerNumber: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  serviceArea: string | null;
  tags: Array<{ tag: { name: string } }>;
};

type DbJob = {
  jobNumber: string;
  customer: { name: string };
  type: string;
  device: string | null;
  status: string;
  dueAt: Date | null;
  description: string;
};

type DbQuote = {
  quoteNumber: string;
  token: string;
  customer: { name: string };
  job: { jobNumber: string } | null;
  status: string;
  items: Array<{ description: string; quantity: unknown; unitPrice: unknown; taxRate: unknown }>;
};

type DbInvoice = {
  invoiceNumber: string;
  customer: { name: string };
  job: { jobNumber: string } | null;
  status: string;
  total: unknown;
  paid: unknown;
};

type DbAppointment = {
  startsAt: Date;
  type: string;
  customer: string | null;
  location: string | null;
};

type DbActivity = {
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
};

async function findOrCreateCustomer(name: string) {
  const existing = await prisma.customer.findFirst({ where: { name, deletedAt: null } });
  if (existing) {
    return existing;
  }

  return prisma.customer.create({
    data: {
      customerNumber: `CUST-${Date.now()}`,
      name,
      type: "Individual",
    },
  });
}

async function loadOperationsFromDb() {
  const [dbCustomers, dbJobs, dbQuotes, dbInvoices, dbAppointments, dbActivity] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({
      where: { deletedAt: null },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quote.findMany({
      include: { customer: true, job: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null },
      include: { customer: true, job: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appointment.findMany({ orderBy: { startsAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return {
    customers: dbCustomers.map((customer: DbCustomer) => ({
      id: customer.customerNumber,
      name: customer.name,
      type: customer.type,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      area: customer.serviceArea ?? "",
      tags: customer.tags.map((item: { tag: { name: string } }) => item.tag.name),
    })),
    jobs: dbJobs.map((job: DbJob) => ({
      number: job.jobNumber,
      customer: job.customer.name,
      type: job.type,
      device: job.device ?? "",
      status: job.status,
      due: job.dueAt?.toISOString().slice(0, 10) ?? "",
      next: job.description,
    })),
    quotes: dbQuotes.map((quote: DbQuote) => ({
      number: quote.quoteNumber,
      token: quote.token,
      customer: quote.customer.name,
      job: quote.job?.jobNumber ?? "",
      status: quote.status,
      expiry: "",
      items: quote.items.map((item: { description: string; quantity: unknown; unitPrice: unknown; taxRate: unknown }) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
      })),
    })),
    invoices: dbInvoices.map((invoice: DbInvoice) => ({
      number: invoice.invoiceNumber,
      customer: invoice.customer.name,
      job: invoice.job?.jobNumber ?? "",
      status: invoice.status,
      total: Number(invoice.total),
      paid: Number(invoice.paid),
    })),
    appointments: dbAppointments.map((appointment: DbAppointment) => ({
      time: appointment.startsAt.toISOString().slice(11, 16),
      type: appointment.type,
      customer: appointment.customer ?? "",
      location: appointment.location ?? "",
    })),
    activity: dbActivity.map((activity: DbActivity) => ({
      id: activity.id,
      title: activity.event,
      detail: `${activity.entityType} ${activity.entityId}`,
      createdAt: activity.createdAt.toLocaleString("en-AU"),
    })),
  };
}

function seedOperations() {
  return { customers, jobs, quotes, invoices, appointments, activity: [] };
}

export async function GET() {
  try {
    return NextResponse.json({ source: "database", data: await loadOperationsFromDb() });
  } catch {
    return NextResponse.json({ source: "seed", data: seedOperations() });
  }
}

export async function POST(request: Request) {
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid operation payload" }, { status: 400 });
  }

  try {
    const input = parsed.data;

    if (input.action === "create-customer") {
      const customer = await prisma.customer.upsert({
        where: { customerNumber: input.customer.id },
        update: {
          name: input.customer.name,
          type: input.customer.type,
          phone: input.customer.phone,
          email: input.customer.email,
          serviceArea: input.customer.area,
        },
        create: {
          customerNumber: input.customer.id,
          name: input.customer.name,
          type: input.customer.type,
          phone: input.customer.phone,
          email: input.customer.email,
          serviceArea: input.customer.area,
        },
      });

      for (const tagName of input.customer.tags) {
        const tag = await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName } });
        await prisma.customerTag.upsert({
          where: { customerId_tagId: { customerId: customer.id, tagId: tag.id } },
          update: {},
          create: { customerId: customer.id, tagId: tag.id },
        });
      }
    }

    if (input.action === "create-job") {
      const customer = await findOrCreateCustomer(input.job.customer);
      await prisma.job.upsert({
        where: { jobNumber: input.job.number },
        update: {
          customerId: customer.id,
          type: input.job.type,
          status: input.job.status,
          device: input.job.device,
          description: input.job.next,
          dueAt: input.job.due ? new Date(`${input.job.due}T00:00:00.000Z`) : null,
        },
        create: {
          jobNumber: input.job.number,
          customerId: customer.id,
          type: input.job.type,
          status: input.job.status,
          priority: "Normal",
          device: input.job.device,
          description: input.job.next,
          dueAt: input.job.due ? new Date(`${input.job.due}T00:00:00.000Z`) : null,
        },
      });
    }

    if (input.action === "create-quote") {
      const customer = await findOrCreateCustomer(input.quote.customer);
      const job = input.quote.job ? await prisma.job.findUnique({ where: { jobNumber: input.quote.job } }) : null;
      await prisma.quote.upsert({
        where: { quoteNumber: input.quote.number },
        update: { status: input.quote.status, token: input.quote.token },
        create: {
          quoteNumber: input.quote.number,
          token: input.quote.token,
          customerId: customer.id,
          jobId: job?.id,
          status: input.quote.status,
          items: {
            create: input.quote.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
            })),
          },
        },
      });
    }

    if (input.action === "create-appointment") {
      const today = new Date().toISOString().slice(0, 10);
      const startsAt = new Date(`${today}T${input.appointment.time}:00.000Z`);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
      await prisma.appointment.create({
        data: {
          type: input.appointment.type,
          startsAt,
          endsAt,
          customer: input.appointment.customer,
          location: input.appointment.location,
        },
      });
    }

    if (input.action === "record-payment") {
      const invoice = await prisma.invoice.findUnique({ where: { invoiceNumber: input.invoiceNumber } });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      const paid = Math.min(Number(invoice.total), Number(invoice.paid) + input.amount);
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: input.amount,
          method: "Manual",
          paidAt: new Date(),
        },
      });
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paid, status: paid >= Number(invoice.total) ? "Paid" : "Partially Paid" },
      });
    }

    if (input.action === "complete-job") {
      const job = await prisma.job.findUnique({ where: { jobNumber: input.jobNumber } });
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      await prisma.job.update({ where: { jobNumber: input.jobNumber }, data: { status: "Completed", description: "Invoice or archive" } });
      await prisma.jobStatusHistory.create({
        data: { jobId: job.id, previous: job.status, next: "Completed" },
      });
    }

    if (input.action === "draft-workflow") {
      await prisma.auditLog.create({
        data: {
          event: input.title,
          entityType: "Workflow",
          entityId: "draft",
          after: { detail: input.detail },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

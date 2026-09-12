import { ok, withRoute, ApiError } from "@/core/http/api";
import { requireTenantContext } from "@/core/tenancy/context";

import { getPatient, updatePatient, deletePatient, updatePatientSchema } from "@/core/sama/patients";

export const GET = withRoute("v1.sama-center.patients.get", async (request, context) => {
  const { tenant } = await requireTenantContext(request);

  const { id } = (context as { params: { id: string } }).params;
  const patient = await getPatient(tenant.organizationId, id);
  return ok(patient);
});

export const PUT = withRoute("v1.sama-center.patients.update", async (request, context) => {
  const { tenant } = await requireTenantContext(request);

  const { id } = (context as { params: { id: string } }).params;
  const body = updatePatientSchema.parse(await request.json().catch(() => null));
  const patient = await updatePatient(
    // @ts-expect-error prisma tx handled internally
    null,
    tenant.organizationId,
    id,
    body,
  );
  return ok(patient);
});

export const DELETE = withRoute("v1.sama-center.patients.delete", async (request, context) => {
  const { tenant } = await requireTenantContext(request);

  const { id } = (context as { params: { id: string } }).params;
  const result = await deletePatient(
    // @ts-expect-error prisma tx handled internally
    null,
    tenant.organizationId,
    id,
  );
  return ok(result);
});

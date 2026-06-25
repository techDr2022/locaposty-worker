import prisma from "@/lib/db";

export async function verifyUserLocationAccess(
  userId: string,
  locationId: string,
): Promise<boolean> {
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      users: {
        some: {
          id: userId,
        },
      },
    },
    select: { id: true },
  });

  return Boolean(location);
}

import { PrismaClient, $Enums } from "@prisma/client";
console.log("Enums keys:", Object.keys($Enums));
try {
  // @ts-ignore
  console.log("ComplaintActionType value:", $Enums.ComplaintActionType);
} catch (e) {
  console.error(e);
}

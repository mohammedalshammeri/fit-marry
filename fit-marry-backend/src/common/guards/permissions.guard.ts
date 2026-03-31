import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const adminId = request.user?.adminId;
    if (!adminId) {
      return false;
    }

    const roles = await this.prisma.adminRole.findMany({
      where: { adminId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const permissionCodes = new Set(
      roles.flatMap((adminRole: any) =>
        adminRole.role.permissions.map((rp: any) => rp.permission.code)
      )
    );

    return requiredPermissions.every((permission) => permissionCodes.has(permission));
  }
}

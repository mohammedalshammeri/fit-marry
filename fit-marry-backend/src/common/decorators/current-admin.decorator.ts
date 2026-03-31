import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentAdmin {
  adminId: string;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdmin => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as CurrentAdmin;
  }
);

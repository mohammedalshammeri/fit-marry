import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface AdminJwtPayload {
  sub: string;
  type: "admin";
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("ADMIN_JWT_SECRET") ?? "admin_dev_secret",
    });
  }

  validate(payload: AdminJwtPayload) {
    return { adminId: payload.sub };
  }
}

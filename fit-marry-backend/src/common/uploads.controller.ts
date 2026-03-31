import { Controller, Get, Param, Res, StreamableFile } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import type { Response } from "express";

@ApiTags("uploads")
@Controller("uploads")
export class UploadsController {
  @Get("avatars/:filename")
  getAvatar(@Param("filename") filename: string, @Res({ passthrough: true }) res: Response) {
    const file = join(process.cwd(), "uploads", "avatars", filename);
    if (!existsSync(file)) {
      res.status(404).send("File not found");
      return;
    }
    const stream = createReadStream(file);
    res.set({
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }
}

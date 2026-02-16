import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { env } from "../config/env";

type AccessTokenPayload = {
    sub: string;
    sid: string;
    jti: string;
    role?: string;
    iat: number;
    exp: number;
};

type RefreshTokenPayload = {
    sub: string;
    sid: string;
    iat: number;
    exp: number;
    tokenType: "refresh";
};

export type SessionTokens = {
    accessToken: string;
    accessTokenExpiresAt: Date;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
    sessionId: string;
};

const ACCESS_TOKEN_LEEWAY_MS = 10_000;

function hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function calculateRefreshExpiry(): Date {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + env.jwtRefreshTokenTtlDays);
    return now;
}

export async function createSession(userId: string, userRole?: string): Promise<SessionTokens> {
    const sessionId = crypto.randomUUID();
    const jwtId = crypto.randomUUID();
    const refreshExpiresAt = calculateRefreshExpiry();

    const accessToken = jwt.sign(
        { sub: userId, sid: sessionId, jti: jwtId, role: userRole },
        env.jwtSecret,
        { expiresIn: env.jwtAccessTokenTtlSeconds },
    );
    const accessDecoded = jwt.decode(accessToken) as AccessTokenPayload;

    const refreshToken = jwt.sign(
        { sub: userId, sid: sessionId, tokenType: "refresh" },
        env.jwtRefreshSecret,
        { expiresIn: `${env.jwtRefreshTokenTtlDays}d`, jwtid: jwtId },
    );

    await prisma.userSession.create({
        data: {
            id: sessionId,
            userId,
            jwtId,
            refreshToken: hashToken(refreshToken),
            expiresAt: refreshExpiresAt,
        },
    });

    return {
        accessToken,
        accessTokenExpiresAt: new Date(accessDecoded.exp * 1000),
        refreshToken,
        refreshTokenExpiresAt: refreshExpiresAt,
        sessionId,
    };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
    const expiryWithLeeway = payload.exp * 1000 + ACCESS_TOKEN_LEEWAY_MS;
    if (expiryWithLeeway <= Date.now()) {
        throw new Error("Access token expired");
    }
    return payload;
}

export async function revokeSession(sessionId: string): Promise<void> {
    await prisma.userSession.deleteMany({
        where: { id: sessionId },
    });
}

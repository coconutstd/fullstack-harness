// API 클라이언트. 계약(01_api_contract.json) 준수:
// - base URL: NEXT_PUBLIC_API_URL (기본 http://localhost:3001)
// - 성공 응답: unwrapped 평면 → JSON을 그대로 T로 반환 (.data 언랩 없음)
// - 에러 응답: { statusCode, message: string | string[], error } → ApiError로 throw

import { getToken } from './auth';
import type { ApiErrorShape } from './types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * 계약 에러 포맷을 담는 에러 객체.
 * - status: HTTP 상태코드 (네트워크 실패 시 0)
 * - messages: message를 항상 string[]로 정규화 (400은 배열, 401/409는 단일 → [msg])
 * - errorType: 계약의 error 필드 ("Bad Request" | "Unauthorized" | "Conflict" ...)
 */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  readonly errorType: string;
  readonly isNetworkError: boolean;

  constructor(params: {
    status: number;
    messages: string[];
    errorType: string;
    isNetworkError?: boolean;
  }) {
    super(params.messages[0] ?? 'Request failed');
    this.name = 'ApiError';
    this.status = params.status;
    this.messages = params.messages;
    this.errorType = params.errorType;
    this.isNetworkError = params.isNetworkError ?? false;
  }
}

function toMessages(message: string | string[] | undefined): string[] {
  if (Array.isArray(message)) return message;
  if (typeof message === 'string' && message.length > 0) return [message];
  return [];
}

function isErrorShape(value: unknown): value is ApiErrorShape {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    'message' in value
  );
}

/**
 * authFetch<T>: 계약 응답 타입 T를 그대로 반환.
 * - init.body가 있고 Content-Type 미지정 시 application/json 자동 부착.
 * - 토큰이 있으면 Authorization: Bearer 자동 부착(인증 불필요 엔드포인트에 붙어도 무해).
 * - !res.ok → 응답 본문을 계약 에러 포맷으로 파싱해 ApiError throw.
 * - fetch 자체 실패(네트워크) → isNetworkError=true, status=0 ApiError throw.
 */
export async function authFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError({
      status: 0,
      messages: ['네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'],
      errorType: 'NetworkError',
      isNetworkError: true,
    });
  }

  const text = await res.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    if (isErrorShape(body)) {
      throw new ApiError({
        status: body.statusCode ?? res.status,
        messages: toMessages(body.message),
        errorType: body.error ?? 'Error',
      });
    }
    // 계약 포맷이 아닌 에러(예: 5xx HTML) → 상태코드만으로 구성
    throw new ApiError({
      status: res.status,
      messages: ['요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'],
      errorType: 'Error',
    });
  }

  return body as T;
}

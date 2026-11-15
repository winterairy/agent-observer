/**
 * 외부 문자열을 키로 쓰는 맵의 안전한 읽기·쓰기(SEC-01).
 * `__proto__`·`constructor`·`prototype` 같은 키가 Object.prototype을 가리키거나 바꾸지 않게 한다.
 * - dict(): 프로토타입 없는 객체. JSON.stringify는 일반 객체와 같게 직렬화한다.
 * - getOwn/hasOwn: 자기 속성만 읽는다(상속 속성 무시).
 * - setOwn: defineProperty로 자기 속성을 만든다(`__proto__` setter를 거치지 않음).
 * structuredClone·JSON.parse 결과는 일반 객체가 되므로 프로토타입에 기대지 않고 항상 이 함수로 접근한다.
 */
export function dict<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

export function getOwn<T>(obj: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

export function setOwn<T>(obj: Record<string, T>, key: string, value: T): T {
  Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
  return value;
}

/** 일반 객체(JSON.parse 결과 등)를 프로토타입 없는 객체로 옮긴다 */
export function toDict<T>(obj: Record<string, T> | null | undefined): Record<string, T> {
  const out = dict<T>();
  if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) setOwn(out, k, obj[k]);
  return out;
}

/**
 * Централизованная проверка обязательных переменных окружения.
 * Приложение не должно запускаться без критических секретов.
 */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET не установлен в .env. Приложение не может быть запущено без безопасного секрета.'
    );
  }
  return secret;
}

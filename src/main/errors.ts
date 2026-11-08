/** خطأ متوقع برسالة عربية آمنة للعرض. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

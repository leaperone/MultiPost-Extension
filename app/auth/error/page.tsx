import Link from 'next/link';
import { Card, CardBody, Button } from '@heroui/react';
import { Home, RefreshCcw, AlertCircle } from 'lucide-react';
import { createTranslation } from '@/i18n/server';

enum Error {
  Configuration = 'Configuration',
  AccessDenied = 'AccessDenied',
  Verification = 'Verification',
  Default = 'Default',
  OAuthAccountNotLinked = 'OAuthAccountNotLinked',
}

// 错误类型到i18n键值的映射
const errorToI18nKey = {
  [Error.Configuration]: 'error.configuration',
  [Error.AccessDenied]: 'error.access_denied',
  [Error.Verification]: 'error.verification',
  [Error.Default]: 'error.default',
  [Error.OAuthAccountNotLinked]: 'error.account_not_linked',
};

const errorCodeMap = {
  [Error.Configuration]: <code className="rounded-sm bg-slate-100 p-1 text-xs">Configuration</code>,
  [Error.AccessDenied]: <code className="rounded-sm bg-slate-100 p-1 text-xs">AccessDenied</code>,
  [Error.Verification]: <code className="rounded-sm bg-slate-100 p-1 text-xs">Verification</code>,
  [Error.Default]: <code className="rounded-sm bg-slate-100 p-1 text-xs">Default</code>,
  [Error.OAuthAccountNotLinked]: <code className="rounded-sm bg-slate-100 p-1 text-xs">OAuthAccountNotLinked</code>,
};

export default async function AuthErrorPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const error = searchParams.error as Error;
  const { t } = await createTranslation('auth');

  // 如果错误类型未知，直接展示错误内容
  const errorMessage = errorToI18nKey[error]
    ? t(errorToI18nKey[error])
    : error
      ? `Unknown error: ${error}`
      : t('error.contact_us');

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-6 text-center">
          <div className="mb-6 flex flex-col items-center justify-center">
            <AlertCircle
              className="mb-2 text-red-500"
              size={36}
            />
            <h5 className="text-xl font-bold tracking-tight">{t('error.title')}</h5>
          </div>

          <div className="mb-8 font-normal text-gray-700 dark:text-gray-400">
            {errorMessage}
            {errorCodeMap[error] && (
              <p className="mt-2">
                {t('error.unique_code')}
                {': '}
                {errorCodeMap[error]}
              </p>
            )}
            <p className="mt-2">{t('error.contact_us')}</p>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              as={Link}
              href="/"
              variant="flat"
              className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              <Home size={18} />
              {t('error.back_home')}
            </Button>

            <Button
              as={Link}
              href="/signin"
              className="flex items-center justify-center gap-2">
              <RefreshCcw size={18} />
              {t('error.try_again')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

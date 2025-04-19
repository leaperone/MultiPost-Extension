'use client';

import { Button, Card, CardBody, Input, Image, Alert } from '@heroui/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRightIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';

interface SearchResult {
  title: string;
  description: string;
  url: string;
  content: string;
  favicon?: string;
}

export default function SearchPage() {
  const { t } = useTranslation('scraper');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  const formSchema = z.object({
    q: z.string().min(1, t('search_keyword_required')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { q: '' },
  });

  const handleSearch = async (query: string, page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, page, num: 10 }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setResults(result.data);
      setHasMore(result.data.length === 10);
      setLastSearchQuery(query);
      toast.success(t('search_success'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('search_failed'));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setCurrentPage(1);
    await handleSearch(data.q, 1);
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await handleSearch(lastSearchQuery, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={cn(
        'flex min-h-[90vh] w-full flex-col transition-all duration-500',
        !results.length && !loading ? 'justify-center' : 'justify-start',
      )}>
      {!results.length && !loading && (
        <div className="flex flex-col items-center gap-4">
          <Alert
            className="w-full max-w-3xl"
            title={t('search')}
            description={t('search_description')}
          />

          {/* Search Input */}
          <div className="w-full max-w-3xl">
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t('search_keyword_placeholder')}
                  {...form.register('q')}
                  size="lg"
                  disabled={loading}
                  startContent={<Search className="size-4" />}
                  isInvalid={!!form.formState.errors.q}
                  errorMessage={form.formState.errors.q?.message}
                  classNames={{
                    input: 'rounded-full bg-white/80 backdrop-blur-sm',
                    inputWrapper: 'rounded-full shadow-lg',
                  }}
                />
                <Button
                  type="submit"
                  isIconOnly
                  color="primary"
                  isLoading={loading}
                  className="rounded-full shadow-lg">
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Results */}
      {(loading || results.length > 0) && (
        <div className="mx-auto w-full max-w-4xl space-y-4 px-6 animate-in fade-in slide-in-from-bottom-4">
          <ScrollArea className="flex h-full flex-1">
            {loading
              ? Array.from({ length: 10 }).map((_, index) => (
                  <Card
                    key={index}
                    className="mx-8 my-4">
                    <CardBody>
                      <div className="space-y-2">
                        <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                      </div>
                    </CardBody>
                  </Card>
                ))
              : results.map((result, index) => (
                  <Card
                    key={index}
                    as="a"
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mx-8 my-4 overflow-hidden transition-all duration-300 hover:shadow-lg">
                    <CardBody>
                      <div className="flex items-start space-x-4">
                        {result.favicon && (
                          <Image
                            src={result.favicon}
                            alt={`${result.title} favicon`}
                            width={16}
                            height={16}
                            className={cn('mt-1.5 rounded-sm object-contain bg-background')}
                          />
                        )}
                        <div className="min-w-0 flex-1 break-words">
                          <div className="group space-y-1">
                            <h3 className="text-lg font-semibold">{result.title}</h3>
                            <p className="text-sm text-default-600">{result.url}</p>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-default-600">{result.description}</p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
          </ScrollArea>

          {/* Pagination */}
          {results.length > 0 && !loading && (
            <div className="flex w-full justify-center gap-4">
              <Button
                isIconOnly
                variant="flat"
                isDisabled={currentPage === 1}
                onPress={() => handlePageChange(currentPage - 1)}
                className="size-10">
                <ArrowRightIcon className="size-4 rotate-180" />
              </Button>
              <Button
                isIconOnly
                variant="flat"
                isDisabled={!hasMore}
                onPress={() => handlePageChange(currentPage + 1)}
                className="size-10">
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

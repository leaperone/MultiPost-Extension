import {
  addToast,
  Button,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from '@heroui/react';
import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock, LinkIcon, Loader2, Pencil, Router, Trash2, Users } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { toast } from 'sonner';

import { linkExtensionClient } from '@/lib/extension';
import { cn } from '@/lib/utils';
import { useTranslation } from '../../../../i18n/client';
import { deleteClient, getClientSettingsData } from '../-server';

export const Route = createFileRoute('/dashboard/settings/_tabs/client')({
  loader: () => getClientSettingsData(),
  component: ClientsPage,
});

function ClientsPage() {
  const { clients, clientCount } = Route.useLoaderData();
  const { t } = useTranslation('publish');

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('client.page.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('client.page.description')}</p>
        </div>
        <LinkExtensionButton />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border p-5 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('client.page.connected_clients')}</p>
              <p className="text-2xl font-bold text-foreground">{clientCount}</p>
            </div>
          </div>
        </Card>
        <Card className="border p-5 shadow-none">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('client.page.active_status')}</p>
              <p className="text-2xl font-bold text-foreground">
                {clientCount > 0
                  ? t('client.page.online', { count: clientCount })
                  : t('client.page.offline')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-8">
        <Card className="border p-4 shadow-none">
          <p className="text-sm text-amber-500 dark:text-amber-400">{t('client.page.alert')}</p>
        </Card>
      </div>

      {clients.length === 0 ? (
        <Card className="border p-12 text-center shadow-none">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-default-100">
              <Router className="size-8 text-foreground/40" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground/90">{t('client.page.empty')}</h3>
              <p className="mt-1 text-sm text-foreground/60">{t('client.page.description')}</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="border p-6 shadow-none">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-500/20">
                  <Router className="size-5 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-foreground/90">{client.name}</h4>
                  <p className="text-sm text-foreground/60">
                    {t('client.page.last_seen', {
                      time: formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true }),
                    })}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className={cn('rounded-xl bg-default-100 p-4')}>
                  <p className="mb-1 text-sm text-foreground/60">Client ID</p>
                  <p className="break-all font-mono text-sm text-foreground/90">{client.id}</p>
                </div>
                <div className="flex justify-between gap-2">
                  <Button
                    as="a"
                    href={`/dashboard/settings/client/${client.id}`}
                    size="sm"
                    variant="flat"
                    className="border bg-default-100 shadow-none"
                    endContent={<ArrowRight className="size-3" />}>
                    View Details
                  </Button>
                  <div className="flex gap-2">
                    <EditNameButton
                      clientId={client.id}
                      initialName={client.name}
                    />
                    <DeleteClientButton clientId={client.id} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteClientButton({ clientId }: { clientId: string }) {
  const { t } = useTranslation('publish');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteClient({ data: { clientId } });
      toast.success(t('client.delete_button.toast.success'));
      onOpenChange();
      await router.invalidate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`${t('client.delete_button.toast.error.title')}: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        color="danger"
        variant="bordered"
        onPress={onOpen}>
        <Trash2 className="mr-2 size-4" />
        {t('client.delete_button.button')}
      </Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t('client.delete_button.modal.title')}</ModalHeader>
              <ModalBody>
                <p className="text-sm text-foreground/70">{t('client.delete_button.modal.description')}</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="bordered"
                  onPress={onClose}
                  isDisabled={isDeleting}>
                  {t('client.delete_button.modal.buttons.cancel')}
                </Button>
                <Button
                  color="danger"
                  onPress={handleDelete}
                  isDisabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t('client.delete_button.modal.buttons.confirm')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

function EditNameButton({
  clientId,
  initialName,
}: {
  clientId: string;
  initialName: string;
}) {
  const { t } = useTranslation('publish');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [name, setName] = useState(initialName);
  const router = useRouter();

  const handleEdit = async () => {
    try {
      const response = await fetch('/api/extension/client', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId, name }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('client.edit_button.toast.success'));
        onOpenChange();
        await router.invalidate();
      } else {
        toast.error(
          `${t('client.edit_button.toast.error.title')}: ${t('client.edit_button.toast.error.description')}`,
        );
      }
    } catch {
      toast.error(
        `${t('client.edit_button.toast.error.title')}: ${t('client.edit_button.toast.error.description')}`,
      );
    }
  };

  return (
    <>
      <Button
        onPress={onOpen}
        variant="bordered"
        className="border border-default-200 shadow-none">
        <Pencil className="mr-2 size-4" />
        {t('client.edit_button.button')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{t('client.edit_button.modal.title')}</ModalHeader>
              <ModalBody>
                <Input
                  label={t('client.edit_button.modal.name_label')}
                  placeholder={t('client.edit_button.modal.name_placeholder')}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  className="shadow-none">
                  {t('client.edit_button.modal.buttons.cancel')}
                </Button>
                <Button
                  color="primary"
                  onPress={handleEdit}
                  className="border border-primary/20 shadow-none">
                  {t('client.edit_button.modal.buttons.save')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

function LinkExtensionButton() {
  const { t } = useTranslation('publish');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const router = useRouter();

  const handleLink = async () => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `EXTENSION-${nanoid(8)}` }),
      });
      const apiKey = await response.json();
      const result = await linkExtensionClient(apiKey.key);
      if (result.confirm) {
        await router.invalidate();
      } else {
        addToast({
          title: t('client.link_button.toast.error.title'),
          description: t('client.link_button.toast.error.description'),
          color: 'danger',
        });
      }
    } catch (error) {
      console.error('Link failed:', error);
    }
  };

  return (
    <>
      <Button
        onPress={onOpen}
        variant="bordered"
        size="sm"
        className="border border-default-200 shadow-none">
        <LinkIcon className="mr-2 size-4" />
        {t('client.link_button.button')}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{t('client.link_button.modal.title')}</ModalHeader>
              <ModalBody>
                <p>{t('client.link_button.modal.description')}</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>{t('client.link_button.modal.notes.credential')}</li>
                  <li>{t('client.link_button.modal.notes.delete')}</li>
                  <li>
                    {t('client.link_button.modal.notes.manage', {
                      link: (
                        <Link
                          to="/dashboard/settings/api-keys"
                          className="text-primary underline">
                          {t('client.link_button.modal.notes.manage_link')}
                        </Link>
                      ),
                    })}
                  </li>
                </ul>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  className="shadow-none">
                  {t('client.link_button.modal.buttons.cancel')}
                </Button>
                <Button
                  color="primary"
                  onPress={handleLink}
                  className="border border-primary/20 shadow-none">
                  {t('client.link_button.modal.buttons.confirm')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

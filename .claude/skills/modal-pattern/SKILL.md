---
name: modal-pattern
description: Settings Modal Pattern using Next.js Parallel Routes and Route Interception. Use when creating modals in settings pages, implementing parallel routes, or building forms that work both as modals and standalone pages.
---

# Settings Modal Pattern (Parallel Routes + Route Interception)

This pattern allows forms to work both as modals (quick edit) and standalone pages (full navigation).

## Directory Structure

```
app/dashboard/settings/(tabs)/account/
├── @modal/                    # Parallel route for modals
│   ├── (.)nickname/          # Intercepts nickname route
│   │   └── page.tsx          # Modal version
│   ├── (.)avatar/            # Intercepts avatar route
│   │   └── page.tsx          # Modal version
│   └── default.tsx           # Default modal content (returns null)
├── nickname/                  # Standalone page route
│   └── page.tsx
├── avatar/                    # Standalone page route
│   └── page.tsx
└── layout.tsx                # Parallel route layout
```

## Route Interception Rules

- `(.)nickname` - Intercepts **same-level** route
- `(..)nickname` - Intercepts **parent-level** route
- `(...)nickname` - Intercepts **root-level** route

When user navigates to `/dashboard/settings/account/nickname`:
- **Soft navigation** (from within app): Shows modal via `@modal/(.)nickname/`
- **Hard navigation** (direct URL/refresh): Shows standalone page via `nickname/`

## Parallel Route Layout

```tsx
// layout.tsx
export default function AccountLayout({
  children,
  modal
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}    {/* Main page content */}
      {modal}       {/* Modal overlay (when active) */}
    </>
  );
}
```

## Modal Page Implementation

```tsx
// @modal/(.)nickname/page.tsx
'use client';

export default function ChangeNicknamePage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.back(); // Close modal, return to previous page
  };

  const handleCancel = () => {
    router.back(); // Close modal, return to previous page
  };

  return (
    <Modal isOpen={true} onClose={handleCancel}>
      <ModalContent>
        <ModalHeader>修改昵称</ModalHeader>
        <ModalBody>
          <ChangeNicknameForm
            isModal={true}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
```

## Standalone Page Implementation

```tsx
// nickname/page.tsx
export default function ChangeNicknamePage() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>修改昵称</CardHeader>
        <CardBody>
          <ChangeNicknameForm /> {/* No isModal prop, defaults to false */}
        </CardBody>
      </Card>
    </div>
  );
}
```

## Reusable Form Component Pattern

**Key principle:** One form component works in both modal and page contexts.

```tsx
// components/forms/ChangeNicknameForm.tsx
interface ChangeNicknameFormProps {
  isModal?: boolean;        // Whether rendered in modal
  onSuccess?: () => void;   // Success callback (modal only)
  onCancel?: () => void;    // Cancel callback (modal only)
}

export default function ChangeNicknameForm({
  isModal = false,
  onSuccess,
  onCancel
}: ChangeNicknameFormProps) {
  const router = useRouter();

  const handleSubmit = async (data: FormData) => {
    try {
      const result = await updateNickname(data);

      if (result.success) {
        await updateAppState(); // Update global state

        if (isModal && onSuccess) {
          onSuccess(); // Modal: Trigger callback (closes modal)
        } else {
          router.push('/dashboard/settings/account'); // Page: Navigate
        }
      }
    } catch (error) {
      // Handle error
    }
  };

  const handleCancelClick = () => {
    if (isModal && onCancel) {
      onCancel(); // Modal: Trigger callback
    } else {
      router.push('/dashboard/settings/account'); // Page: Navigate
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input name="nickname" />
      {!isModal && (
        <div className="flex gap-2">
          <Button type="button" onPress={handleCancelClick}>取消</Button>
          <Button type="submit">确认</Button>
        </div>
      )}
    </form>
  );
}
```

## Default Modal Content

```tsx
// @modal/default.tsx
export default function Default() {
  return null; // Displayed when no modal route is active
}
```

## Best Practices

- Always implement both modal and page versions
- Use `router.back()` to close modals (not state management)
- Forms must handle both `isModal={true}` and `isModal={false}`
- Update global state before triggering navigation/callbacks
- Modal buttons in ModalFooter, page buttons in form
- Test both soft and hard navigation scenarios

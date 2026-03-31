'use server';

interface HeaderProps {
  title?: string;
  description?: string;
}

export default async function Header({ title, description }: HeaderProps) {
  return (
    <div className="p-2">
      {title && <h1 className="text-2xl font-bold">{title}</h1>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

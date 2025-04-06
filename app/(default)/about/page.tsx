import { Button, Link } from '@heroui/react';
import { Metadata } from 'next';
import Image from 'next/image';
import { Github } from 'lucide-react';

interface FocusItem {
  title: string;
  description: string;
}

export const metadata: Metadata = {
  title: 'About MultiPost',
  description: 'Learn about our team and mission - Join the MultiPost-Extension Open Source Community',
};

export default function AboutPage() {
  const focusItems: FocusItem[] = [
    {
      title: 'Seamless Publishing',
      description: 'Enabling content creators to share their work across multiple platforms with a single click.',
    },
    {
      title: 'User Privacy',
      description: 'Prioritizing user data protection with secure, client-side processing.',
    },
    {
      title: 'Open Collaboration',
      description: 'Building a community-driven tool through open source development and transparent processes.',
    },
  ];

  return (
    <div className="min-h-screen bg-background py-16">
      {/* Page Title */}
      <div className="container mx-auto mb-12 px-4 text-center">
        <h1 className="mb-6 text-4xl font-bold tracking-tight">About MultiPost</h1>
        <div className="mx-auto mb-8 h-1 w-16 bg-primary"></div>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Our mission is to empower content creators with innovative tools for sharing across multiple platforms
          effortlessly.
        </p>
      </div>

      {/* Organization Introduction */}
      <div className="container mx-auto mb-16 px-4">
        <div className="rounded-lg border border-border bg-background p-8 shadow-sm">
          <div className="mb-10">
            <h2 className="mb-6 text-center text-3xl font-bold">Our Organization</h2>
            <p className="mx-auto max-w-3xl text-center text-lg text-muted-foreground">
              MultiPost is a community-driven initiative focused on creating innovative publishing solutions. We believe
              in the power of open source development and collaborative creation.
            </p>
          </div>

          <div>
            <h3 className="mb-8 text-center text-2xl font-semibold">Our Focus Areas</h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {focusItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-md">
                  <h4 className="mb-3 text-xl font-semibold">{item.title}</h4>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Join the Community Section (integrated both sections) */}
      <div className="container mx-auto px-4">
        <div className="rounded-lg border border-border bg-background p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Left Column: Open Source Community */}
            <div className="flex flex-col items-center justify-start">
              <h2 className="mb-8 text-center text-3xl font-bold">Join Our Open Source Community</h2>

              {/* Hero Image */}
              <div className="relative mb-6 aspect-[3/4] w-full max-w-xs">
                <Image
                  src="https://2someone-web-static.s3.bitiful.net/2025/04/83dd4f3c48d6f509c39f930cb84eb4f7.png"
                  alt="I Want You"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <div className="max-w-md space-y-6 text-center">
                <p className="text-xl">
                  We are looking for passionate developers to contribute to this one-click multi-platform publishing
                  tool!
                </p>

                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  <Button
                    as={Link}
                    href="https://github.com/leaperone/MultiPost-Extension"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary px-6 py-2 text-white">
                    <Github className="mr-2 size-5" />
                    View GitHub Repository
                  </Button>

                  <Button
                    as={Link}
                    href="https://github.com/leaperone/MultiPost-Extension/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="bordered"
                    className="border-primary px-6 py-2 text-primary">
                    Browse Open Issues
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Info */}
            <div className="flex flex-col items-center justify-start">
              <h2 className="mb-8 text-center text-3xl font-bold">Contact Us</h2>

              <div className="flex size-full max-w-md flex-col items-center justify-center space-y-8 rounded-lg border border-border bg-card/50 p-8">
                {/* QQ Group */}
                <div className="w-full space-y-4">
                  <h3 className="text-center text-xl font-semibold">QQ Group</h3>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-2xl font-medium">921137242</div>
                    <Button
                      variant="ghost"
                      className="rounded-full bg-background/50 px-6 backdrop-blur-sm hover:bg-background/80"
                      as={Link}
                      href="https://qm.qq.com/cgi-bin/qm/qr?k=oLmJfZ4fDX57d3f2KxiYO3UPYvKQHpr_&jump_from=webapi&authKey=MhYchsgbIHtjcbfGD3rjpplY3jlZvBur0fHA4ahzSFMYFrAXnZ+rR3pKBKdh+b9v"
                      target="_blank">
                      Join Us
                    </Button>
                  </div>
                </div>

                {/* Email Contact */}
                <div className="w-full space-y-4">
                  <h3 className="text-center text-xl font-semibold">Email</h3>
                  <div className="text-center">
                    <a
                      href="mailto:support@leaper.one"
                      className="text-lg font-medium text-primary hover:underline">
                      support@leaper.one
                    </a>
                  </div>
                </div>

                {/* Other Contact Methods */}
                <div className="w-full space-y-4 pt-4">
                  <p className="text-center text-muted-foreground">
                    We welcome contributions and feedback of any kind. Whether you want to join the team, report an
                    issue, or share ideas, please reach out through the contact methods above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

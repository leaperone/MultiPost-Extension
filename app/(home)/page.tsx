import { Card, CardBody, Button, Link } from '@heroui/react';
import { ArrowRight, Share2, Github, Zap, Globe2, Sparkles } from 'lucide-react';

import FooterWithColumns from '@/components/HomePage/FooterWithColumns';
import HomePageHeader from '@/components/HomePage/Header';
import HeroSection from './hero-section';

export const metadata = {
  title: 'MultiPost - Open Source Social Media Publishing Tool',
  description:
    'MultiPost is an open source browser extension that helps you publish content to multiple social media platforms with one click. Save time and boost your social media presence.',
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <HomePageHeader />
      <main className="grow">
        <HeroSection className="h-[70vh]" />

        {/* Key Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-4">
                Streamline Your Social Media Workflow
              </h2>
              <p className="text-xl text-foreground/80">
                Save time and maintain consistency across all your social media platforms with our powerful features
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <Zap className="size-6 text-primary" />,
                  title: 'One-Click Publishing',
                  description: 'Post to multiple platforms simultaneously with a single click',
                  gradient: 'bg-primary/10',
                  textColor: 'text-primary',
                },
                {
                  icon: <Share2 className="size-6 text-secondary" />,
                  title: 'No Extra Login',
                  description: 'Uses your existing browser sessions - no additional authentication needed',
                  gradient: 'bg-secondary/10',
                  textColor: 'text-secondary',
                },
                {
                  icon: <Globe2 className="size-6 text-success" />,
                  title: 'Platform Optimization',
                  description: "Automatically formats content for each platform's requirements",
                  gradient: 'bg-success/10',
                  textColor: 'text-success',
                },
              ].map((feature, i) => (
                <Card
                  key={i}
                  className="hover:scale-105 transition-all duration-300 hover:shadow-lg group border-none"
                  isPressable>
                  <CardBody className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full ${feature.gradient} p-3`}>{feature.icon}</div>
                      <div>
                        <h3 className={`mb-2 text-xl font-semibold ${feature.textColor} flex items-center gap-2`}>
                          {feature.title}
                          <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </h3>
                        <p className="text-foreground/80">{feature.description}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Product Demo Section */}
        <section className="py-20 bg-default-50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-6">
                  Powerful Yet Simple
                </h2>
                <div className="space-y-6">
                  {[
                    'Write once, publish everywhere',
                    'Preview how your post will look on each platform',
                    'Schedule posts for optimal timing',
                    'Track post performance across platforms',
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-1">
                        <Sparkles className="size-5 text-primary" />
                      </div>
                      <span className="text-lg text-foreground/90">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-8 bg-gradient-to-r from-primary to-secondary text-white px-8 py-6 rounded-xl"
                  size="lg"
                  as={Link}
                  href="/extension">
                  Install Extension
                </Button>
              </div>
              <div className="relative">
                <div className="aspect-video rounded-xl bg-content1 shadow-xl">
                  {/* Add product screenshot or demo video here */}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1 rounded-full mb-4">
                <Github className="size-4" />
                <span className="text-sm font-semibold">Open Source</span>
              </div>
              <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-4">
                Built by the Community, for the Community
              </h2>
              <p className="text-xl text-foreground/80">
                MultiPost is open source and free forever. Join us in building the future of social media management.
              </p>
            </div>

            <div className="mt-12 text-center">
              <Button
                as={Link}
                href="https://github.com/leaper-one/MultiPost-Extension"
                target="_blank"
                className="bg-default-100 text-foreground hover:bg-default-200"
                size="lg"
                startContent={<Github className="size-5" />}>
                View on GitHub
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-default-50">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {[
                {
                  question: 'How does MultiPost work?',
                  answer:
                    'MultiPost is a browser extension that uses your existing social media logins to publish content. No need for additional authentication or API keys.',
                },
                {
                  question: 'Which platforms are supported?',
                  answer:
                    'We currently support Twitter, Facebook, LinkedIn, Instagram, and more. The list is growing with community contributions.',
                },
                {
                  question: 'Is it really free?',
                  answer:
                    'Yes! MultiPost is completely free and open source. You can use all features without any restrictions.',
                },
                {
                  question: 'How can I contribute?',
                  answer:
                    'You can contribute by starring the repository, reporting issues, submitting pull requests, or improving documentation.',
                },
              ].map((faq, i) => (
                <Card key={i}>
                  <CardBody className="p-6">
                    <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                    <p className="text-foreground/80">{faq.answer}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">Start Publishing Smarter Today</h2>
            <p className="mb-8 text-white/90 max-w-2xl mx-auto">
              Join our growing community of content creators and developers
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                as={Link}
                href="/extension"
                className="bg-white text-primary hover:bg-white/90">
                Install Extension
              </Button>
              <Button
                size="lg"
                as={Link}
                href="https://github.com/leaper-one/MultiPost-Extension"
                target="_blank"
                className="bg-transparent border-2 border-white text-white hover:bg-white/10"
                startContent={<Github className="size-5" />}>
                Star on GitHub
              </Button>
            </div>
          </div>
        </section>
      </main>
      <FooterWithColumns />
    </div>
  );
}

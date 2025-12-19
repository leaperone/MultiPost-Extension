'use client';

import { Users, FileText, Github, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  trend?: string;
}

function StatItem({ icon, value, label, trend }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-white/80 p-4 backdrop-blur-sm transition-transform hover:scale-105 dark:bg-gray-800/50">
      <div className="rounded-full bg-primary/10 p-2">{icon}</div>
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {value}
          {trend && <span className="ml-1 text-sm text-green-500">{trend}</span>}
        </div>
        <div className="text-sm text-foreground-600">{label}</div>
      </div>
    </div>
  );
}

export function SocialProof() {
  const [githubStars, setGithubStars] = useState('1.2k');

  // 从 shields.io 获取 GitHub stars 数据（通过服务端 API）
  useEffect(() => {
    fetch('/api/github/stars')
      .then((res) => res.json())
      .then((data) => {
        if (data.stars) {
          setGithubStars(data.stars);
        }
      })
      .catch(() => {
        // 如果API请求失败，保持默认值
      });
  }, []);

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatItem
        icon={<Users className="size-5 text-blue-500" />}
        value="5k+"
        label="活跃用户"
        trend="↑23%"
      />
      <StatItem
        icon={<FileText className="size-5 text-green-500" />}
        value="50k+"
        label="内容发布"
      />
      <StatItem
        icon={<Github className="size-5 text-purple-500" />}
        value={githubStars}
        label="GitHub Stars"
      />
      <StatItem
        icon={<TrendingUp className="size-5 text-orange-500" />}
        value="98%"
        label="满意度"
      />
    </div>
  );
}

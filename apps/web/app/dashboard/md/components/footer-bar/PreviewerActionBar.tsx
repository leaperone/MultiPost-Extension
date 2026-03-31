'use client'

import { Button, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Divider } from '@heroui/react'
import {
  ClipboardCopy,
  Code,
  Code2,
  Download,
  FileText,
  ImageDown,
  Palette,
  Printer,
  Workflow,
  Brush,
  Presentation,
} from 'lucide-react'
import { useCallback } from 'react'
import { copyPlatform, copyImage, exportImage, exportPdf, printPreview } from '@/lib/markdown-engine/actions'
import { markdownStyles } from '@/lib/markdown-engine/themes/markdown-style'
import { codeThemes } from '@/lib/markdown-engine/themes/code-theme'
import { mermaidThemes } from '@/lib/markdown-engine/themes/mermaid-theme'
import { infographicThemes, infographicPalettes } from '@/lib/markdown-engine/themes/infographic-theme'
import { useMdPreviewStore } from '@/store/md-preview.store'
import { WechatIcon, ZhihuIcon, JuejinIcon } from '../icons'
import { usePlatformCopy } from '../preview/usePlatformCopy'
import CustomCssDialog from './CustomCssDialog'

function CopyButton({ platform, icon, label }: { platform: 'wechat' | 'zhihu' | 'juejin' | 'html'; icon: React.ReactNode; label: string }) {
  const { getHtml, isLoading } = usePlatformCopy(platform)
  const handleCopy = useCallback(async () => {
    await copyPlatform({ platform, getHtml })
  }, [platform, getHtml])

  return (
    <Tooltip content={label}>
      <Button isIconOnly variant="light" size="sm" aria-label={label} onPress={handleCopy} isDisabled={isLoading}>
        {icon}
      </Button>
    </Tooltip>
  )
}

export default function PreviewerActionBar() {
  const markdownStyle = useMdPreviewStore(s => s.markdownStyle)
  const setMarkdownStyle = useMdPreviewStore(s => s.setMarkdownStyle)
  const codeTheme = useMdPreviewStore(s => s.codeTheme)
  const setCodeTheme = useMdPreviewStore(s => s.setCodeTheme)
  const mermaidTheme = useMdPreviewStore(s => s.mermaidTheme)
  const setMermaidTheme = useMdPreviewStore(s => s.setMermaidTheme)
  const infographic = useMdPreviewStore(s => s.infographic)
  const setInfographic = useMdPreviewStore(s => s.setInfographic)

  return (
    <div className="flex items-center gap-0.5">
      {/* Platform Copy Buttons */}
      <CopyButton platform="wechat" icon={<WechatIcon className="size-4" />} label="复制为微信格式" />
      <CopyButton platform="zhihu" icon={<ZhihuIcon className="size-4" />} label="复制为知乎格式" />
      <CopyButton platform="juejin" icon={<JuejinIcon className="size-4" />} label="复制为掘金格式" />
      <CopyButton platform="html" icon={<Code2 className="size-4" />} label="复制 HTML" />

      {/* Export Dropdown */}
      <Dropdown>
        <Tooltip content="导出">
          <div>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" aria-label="导出">
                <Download className="size-4" />
              </Button>
            </DropdownTrigger>
          </div>
        </Tooltip>
        <DropdownMenu aria-label="导出选项">
          <DropdownItem key="copy-image" startContent={<ClipboardCopy className="size-4" />} onPress={copyImage}>
            复制图片
          </DropdownItem>
          <DropdownItem key="export-image" startContent={<ImageDown className="size-4" />} onPress={exportImage}>
            导出图片
          </DropdownItem>
          <DropdownItem key="export-pdf" startContent={<FileText className="size-4" />} onPress={exportPdf}>
            导出 PDF
          </DropdownItem>
          <DropdownItem key="print" startContent={<Printer className="size-4" />} onPress={printPreview}>
            打印预览
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      <Divider orientation="vertical" className="mx-1 h-5" />

      {/* Markdown Style Menu */}
      <Dropdown>
        <Tooltip content="排版样式">
          <div>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" aria-label="排版样式">
                <Palette className="size-4" />
              </Button>
            </DropdownTrigger>
          </div>
        </Tooltip>
        <DropdownMenu
          aria-label="排版样式"
          selectionMode="single"
          selectedKeys={new Set([markdownStyle])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0]
            if (typeof selected === 'string') setMarkdownStyle(selected)
          }}
          className="max-h-80 overflow-auto"
        >
          <DropdownSection title="排版样式">
            {markdownStyles.map(style => (
              <DropdownItem key={style.id}>{style.name}</DropdownItem>
            ))}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      {/* Code Theme Menu */}
      <Dropdown>
        <Tooltip content="代码主题">
          <div>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" aria-label="代码主题">
                <Code className="size-4" />
              </Button>
            </DropdownTrigger>
          </div>
        </Tooltip>
        <DropdownMenu
          aria-label="代码主题"
          selectionMode="single"
          selectedKeys={new Set([codeTheme])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0]
            if (typeof selected === 'string') setCodeTheme(selected)
          }}
          className="max-h-80 overflow-auto"
        >
          <DropdownSection title="代码主题">
            {codeThemes.map(theme => (
              <DropdownItem key={theme.id}>{theme.name}</DropdownItem>
            ))}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      {/* Mermaid Theme Menu */}
      <Dropdown>
        <Tooltip content="流程图主题">
          <div>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" aria-label="流程图主题">
                <Workflow className="size-4" />
              </Button>
            </DropdownTrigger>
          </div>
        </Tooltip>
        <DropdownMenu
          aria-label="流程图主题"
          selectionMode="single"
          selectedKeys={new Set([mermaidTheme])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0]
            if (typeof selected === 'string') setMermaidTheme(selected)
          }}
          className="max-h-80 overflow-auto"
        >
          <DropdownSection title="流程图主题">
            {mermaidThemes.map(theme => (
              <DropdownItem key={theme.id}>{theme.name}</DropdownItem>
            ))}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      {/* Infographic Settings Menu */}
      <Dropdown>
        <Tooltip content="信息图设置">
          <div>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" aria-label="信息图设置">
                <Presentation className="size-4" />
              </Button>
            </DropdownTrigger>
          </div>
        </Tooltip>
        <DropdownMenu aria-label="信息图设置" className="max-h-80 overflow-auto">
          <DropdownSection title="信息图主题">
            {infographicThemes.map(theme => (
              <DropdownItem
                key={`theme-${theme.id}`}
                className={infographic.theme === theme.id ? 'text-primary' : ''}
                onPress={() => setInfographic({ theme: theme.id })}
              >
                {theme.name}
              </DropdownItem>
            ))}
          </DropdownSection>
          <DropdownSection title="信息图配色">
            {infographicPalettes.map(palette => (
              <DropdownItem
                key={`palette-${palette.id}`}
                className={infographic.palette === palette.id ? 'text-primary' : ''}
                onPress={() => setInfographic({ palette: palette.id })}
              >
                {palette.name}
              </DropdownItem>
            ))}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      {/* Custom CSS Dialog */}
      <CustomCssDialog />
    </div>
  )
}

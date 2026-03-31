'use client'

import {
  Button,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  useDisclosure,
} from '@heroui/react'
import { Brush, ChevronDown } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useMdPreviewStore } from '@/store/md-preview.store'

const CSS_EXAMPLES = `/* 修改标题颜色 */
#mp-md h1 { color: #e74c3c; }
#mp-md h2 { color: #3498db; }

/* 调整段落行高 */
#mp-md p { line-height: 1.8; }

/* 自定义引用块样式 */
#mp-md blockquote {
  border-left-color: #9b59b6;
  background: #f8f4fc;
}

/* 调整代码块圆角 */
#mp-md pre { border-radius: 8px; }

/* 图片居中并添加阴影 */
#mp-md img {
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}`

const MAX_CSS_LENGTH = 50000

export default function CustomCssDialog() {
  const customCss = useMdPreviewStore(s => s.customCss)
  const setCustomCss = useMdPreviewStore(s => s.setCustomCss)
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const [localCss, setLocalCss] = useState(customCss)
  const [examplesOpen, setExamplesOpen] = useState(false)

  const hasCustomCss = customCss.trim().length > 0
  const isOverLimit = localCss.length > MAX_CSS_LENGTH

  const handleOpen = useCallback(() => {
    setLocalCss(customCss)
    onOpen()
  }, [customCss, onOpen])

  const handleSave = useCallback((onClose: () => void) => {
    setCustomCss(localCss)
    onClose()
  }, [localCss, setCustomCss])

  const handleClear = useCallback(() => {
    setLocalCss('')
  }, [])

  return (
    <>
      <Tooltip content="自定义 CSS">
        <Button isIconOnly variant="light" size="sm" aria-label="自定义 CSS" onPress={handleOpen}>
          <Brush className={`size-4 ${hasCustomCss ? 'text-primary' : ''}`} />
        </Button>
      </Tooltip>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>自定义 CSS</ModalHeader>
              <ModalBody>
                <p className="text-sm text-muted-foreground">
                  CSS 选择器需约束在{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">#mp-md</code>
                  {' '}下，在主题样式之后应用。
                </p>
                <Textarea
                  value={localCss}
                  onValueChange={setLocalCss}
                  placeholder="输入自定义 CSS 样式..."
                  minRows={6}
                  maxRows={12}
                  classNames={{ input: 'font-mono text-xs' }}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {localCss.length.toLocaleString()} / {MAX_CSS_LENGTH.toLocaleString()} 字符
                  </span>
                  {isOverLimit && <span className="text-danger">超出限制</span>}
                </div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted"
                  onClick={() => setExamplesOpen(!examplesOpen)}
                >
                  <span>查看示例</span>
                  <ChevronDown className={`size-4 transition-transform ${examplesOpen ? 'rotate-180' : ''}`} />
                </button>
                {examplesOpen && (
                  <pre className="max-h-48 overflow-auto rounded bg-muted p-3 font-mono text-xs">
                    {CSS_EXAMPLES}
                  </pre>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="bordered" onPress={handleClear}>清空</Button>
                <Button color="primary" onPress={() => handleSave(onClose)} isDisabled={isOverLimit}>保存</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}

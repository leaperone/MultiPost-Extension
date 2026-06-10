export const iframeShellHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no"
    />
    <title>MultiPost Markdown</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      #mp-md {
        box-sizing: border-box;
        min-height: 100vh;
        min-height: 100dvh;
      }

      @media (max-width: 376px) {
        #mp-md {
          padding-top: 48px !important;
        }
      }

      ::-webkit-scrollbar {
        display: none;
      }
      * {
        scrollbar-width: none;
      }
    </style>
  </head>
  <body></body>
</html>`

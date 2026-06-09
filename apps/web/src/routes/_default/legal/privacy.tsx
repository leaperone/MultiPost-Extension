import { createFileRoute } from '@tanstack/react-router';

import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/_default/legal/privacy')({
  head: () => ({
    meta: routeMeta({
      title: 'Privacy Policy - How MultiPost Protects Your Data',
      description:
        'Learn how MultiPost collects, uses, and protects your personal information. Our privacy policy covers data security, browser extension permissions, payment processing, and your privacy rights.',
    }),
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="prose prose-slate mx-auto max-w-4xl space-y-6 px-4 py-8 dark:prose-invert">
      <h1 className="mb-8 text-3xl font-bold">MultiPost 隐私政策</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">最近更新时间：2025年1月</p>

      <div className="space-y-4">
        <div className="my-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="leading-relaxed text-gray-600 dark:text-gray-300">
            MultiPost（以下简称&ldquo;我们&rdquo;）是一款开源的多平台社交媒体内容发布工具，包括浏览器扩展和网站服务。我们非常重视用户的个人信息和隐私保护，并致力于以透明的方式收集和使用您的数据。
          </p>
        </div>

        <h2 className="mb-4 mt-8 text-xl font-semibold">一、重要提示</h2>
        <p>
          1.1 请您在使用 MultiPost 服务之前，认真阅读并充分理解本隐私政策。当您开始使用我们的产品或服务时，即表示您已阅读并同意本隐私政策。
        </p>
        <p>
          1.2 我们可能会适时修订本隐私政策。当隐私政策发生变更时，我们会在网站上发布更新后的版本。若您继续使用我们的服务，即表示您同意受修订后的隐私政策约束。
        </p>
        <p>
          1.3 如对本隐私政策有任何疑问，您可以通过本政策末尾的联系方式与我们联系。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">二、我们的服务</h2>
        <p>MultiPost 提供以下主要服务：</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>浏览器扩展</strong>：帮助您一键将内容发布到多个社交媒体平台（如微博、小红书、Twitter、LinkedIn 等）</li>
          <li><strong>草稿管理</strong>：在网站上管理和编辑您的发布内容</li>
          <li><strong>AI 辅助创作</strong>：使用人工智能帮助您优化和生成内容</li>
          <li><strong>图片和海报生成</strong>：创建适合社交媒体的图片内容</li>
          <li><strong>视频文案提取</strong>：从视频中提取文字内容</li>
        </ul>

        <h2 className="mb-4 mt-8 text-xl font-semibold">三、我们收集的信息</h2>
        <p>我们仅在必要时收集以下类型的信息：</p>

        <h3 className="mb-3 mt-6 text-lg font-medium">3.1 账号信息</h3>
        <p>当您注册 MultiPost 账号时，我们会收集：</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>电子邮箱地址（用于账号登录和通知）</li>
          <li>用户名和头像（如通过第三方登录提供）</li>
          <li>第三方登录信息（如您选择通过 GitHub 或 Google 登录）</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">3.2 发布内容</h3>
        <p>当您使用我们的服务时，我们会处理：</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>您创建的草稿内容（文字、图片等）</li>
          <li>您选择发布的社交媒体平台信息</li>
          <li>发布历史记录</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">3.3 浏览器扩展权限</h3>
        <p>MultiPost 浏览器扩展需要以下权限才能正常工作：</p>
        <ul className="ml-6 list-disc space-y-1">
          <li><strong>访问社交媒体网站</strong>：用于在目标平台上发布内容</li>
          <li><strong>存储权限</strong>：用于保存您的设置和草稿</li>
          <li><strong>网络请求权限</strong>：用于与 MultiPost 服务器通信</li>
        </ul>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          注意：我们不会收集您的浏览历史、密码或其他与 MultiPost 功能无关的个人信息。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">3.4 付费信息</h3>
        <p>当您购买付费服务（如 AI 积分）时：</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>支付信息由第三方支付服务商（Stripe 或支付宝）处理</li>
          <li>我们仅保存订单记录和积分余额信息</li>
          <li>我们不会直接存储您的银行卡或支付账户信息</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">3.5 使用数据</h3>
        <p>为了改进服务，我们可能收集匿名的使用统计数据，如功能使用频率、错误报告等。</p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">四、我们如何使用您的信息</h2>
        <p>我们收集的信息将用于以下目的：</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>提供、维护和改进 MultiPost 服务</li>
          <li>处理您的发布请求和管理您的内容</li>
          <li>处理付费订单和管理积分系统</li>
          <li>发送服务相关通知（如功能更新、安全提醒）</li>
          <li>响应您的客服请求</li>
          <li>防止欺诈和滥用行为</li>
        </ul>

        <h2 className="mb-4 mt-8 text-xl font-semibold">五、信息共享与披露</h2>
        <p>我们不会出售您的个人信息。我们仅在以下情况下共享您的信息：</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>经您同意</strong>：在获得您明确同意后</li>
          <li><strong>第三方服务</strong>：与帮助我们提供服务的合作伙伴（如支付处理商、云服务提供商）</li>
          <li><strong>法律要求</strong>：根据法律法规要求或政府部门的强制性要求</li>
          <li><strong>保护权益</strong>：为保护 MultiPost、用户或公众的权利、财产或安全</li>
        </ul>

        <h2 className="mb-4 mt-8 text-xl font-semibold">六、数据安全</h2>
        <p>
          我们采取行业标准的安全措施保护您的个人信息，包括数据加密、访问控制和安全审计。但请注意，没有任何互联网传输或电子存储方法是100%安全的。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">七、数据存储</h2>
        <p>
          7.1 您的数据主要存储在中华人民共和国境内的服务器上。
        </p>
        <p>
          7.2 我们会在实现服务目的所需的最短时间内保留您的个人信息。当您注销账号后，我们将删除或匿名化处理您的个人信息（法律法规另有规定的除外）。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">八、您的权利</h2>
        <p>您对自己的个人信息享有以下权利：</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>访问权</strong>：查看我们持有的关于您的个人信息</li>
          <li><strong>更正权</strong>：更正不准确或不完整的个人信息</li>
          <li><strong>删除权</strong>：要求删除您的个人信息</li>
          <li><strong>注销权</strong>：注销您的 MultiPost 账号</li>
        </ul>
        <p className="mt-2">
          您可以通过登录账号设置页面或联系我们来行使上述权利。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">九、Cookie 和类似技术</h2>
        <p>
          我们使用 Cookie 和类似技术来维持您的登录状态、记住您的偏好设置，以及分析服务使用情况。您可以通过浏览器设置管理 Cookie，但这可能影响某些功能的正常使用。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">十、未成年人保护</h2>
        <p>
          MultiPost 服务面向成年用户。如果您是未成年人，请在监护人的指导下使用我们的服务。我们不会故意收集未成年人的个人信息。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">十一、开源声明</h2>
        <p>
          MultiPost 浏览器扩展是开源软件，源代码托管在 GitHub 上。您可以审查我们的代码以了解数据处理的具体实现。访问：
          <a href="https://github.com/leaper-one/MultiPost-Extension" className="text-blue-600 hover:underline dark:text-blue-400" target="_blank" rel="noopener noreferrer">
            https://github.com/leaper-one/MultiPost-Extension
          </a>
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">十二、争议解决</h2>
        <p>
          12.1 本隐私政策的订立、生效、解释、修订、补充、终止、执行与争议解决，均适用中华人民共和国大陆地区的法律。
        </p>
        <p>
          12.2 因本隐私政策产生的争议，双方应协商解决。协商不成时，双方同意将纠纷提交珠海市香洲区人民法院解决。
        </p>

        <div className="mt-8 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold">十三、联系我们</h2>
          <p className="mb-4">如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：</p>
          <p className="text-gray-600 dark:text-gray-300">官方 QQ 群：867578227</p>
          <p className="text-gray-600 dark:text-gray-300">电子邮件：support@leaper.one</p>
          <p className="text-gray-600 dark:text-gray-300">GitHub：<a href="https://github.com/leaper-one/MultiPost-Extension" className="text-blue-600 hover:underline dark:text-blue-400" target="_blank" rel="noopener noreferrer">MultiPost-Extension</a></p>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';

import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/_default/legal/terms')({
  head: () => ({
    meta: routeMeta({
      title: 'Terms of Service - MultiPost User Agreement',
      description:
        'Read the MultiPost terms of service covering account management, content guidelines, paid services, intellectual property, and user responsibilities for our multi-platform publishing tool.',
    }),
  }),
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <div className="prose prose-slate mx-auto max-w-4xl space-y-6 px-4 py-8 dark:prose-invert">
      <h1 className="mb-8 text-3xl font-bold">MultiPost 服务条款</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">最近更新时间：2025年1月</p>

      <div className="space-y-4">
        <p>欢迎使用 MultiPost！</p>
        <p>
          本《MultiPost 服务条款》（以下简称&ldquo;本协议&rdquo;）是由用户（以下简称&ldquo;您&rdquo;）与 MultiPost（以下简称&ldquo;我们&rdquo;或&ldquo;本平台&rdquo;）所订立的法律协议。《MultiPost 隐私政策》以及本平台发布的其他协议、规则、公告等，均为本协议不可分割的组成部分，您在使用本平台服务时应同样遵守。
        </p>
        <p>
          请您在使用我们的服务之前，认真阅读并充分理解本协议，特别是涉及免除或限制责任的条款、知识产权条款、法律适用和争议解决条款等。其中，免除或限制责任条款等重要内容将以<strong>加粗形式</strong>提示您注意。
        </p>
        <p>
          您使用本平台的行为将被视为已经仔细阅读、充分理解并接受本协议所有条款。如果您不同意本协议中的任何条款，请立即停止使用本平台服务。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">一、服务说明</h2>
        <h3 className="mb-3 mt-6 text-lg font-medium">1.1 MultiPost 是什么</h3>
        <p>MultiPost 是一款开源的多平台社交媒体内容发布工具，提供以下服务：</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>浏览器扩展</strong>：帮助您将内容一键发布到多个社交媒体平台，包括但不限于微博、小红书、Twitter/X、LinkedIn、知乎、今日头条等</li>
          <li><strong>网站服务</strong>：提供草稿管理、内容编辑、发布历史等功能</li>
          <li><strong>AI 辅助创作</strong>：使用人工智能技术帮助您优化和生成内容</li>
          <li><strong>图片和海报生成</strong>：创建适合社交媒体分享的图片内容</li>
          <li><strong>视频文案提取</strong>：从抖音、TikTok 等平台的视频中提取文字内容</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">1.2 服务获取渠道</h3>
        <p>我们的产品和服务仅通过以下官方渠道提供：</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>官方网站：multipost.app</li>
          <li>Chrome 网上应用店</li>
          <li>Microsoft Edge 外接程序商店</li>
          <li>GitHub 开源仓库</li>
        </ul>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          若您从非官方渠道获取我们的产品，我们无法保证其安全性和功能完整性。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">1.3 服务性质</h3>
        <p>
          您理解并同意：MultiPost 是一个中立的技术工具，仅为用户提供内容发布的便利。我们不参与您发布内容的创作，也不对您发布的内容承担责任。您对通过 MultiPost 发布的所有内容负全部责任。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">二、账号管理</h2>
        <h3 className="mb-3 mt-6 text-lg font-medium">2.1 账号注册</h3>
        <p>
          部分 MultiPost 功能需要注册账号。您可以通过以下方式注册：
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>电子邮箱注册</li>
          <li>GitHub 账号授权登录</li>
          <li>Google 账号授权登录</li>
          <li>Passkey（通行密钥）</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">2.2 账号安全</h3>
        <p>
          您应妥善保管账号信息和密码。因您的原因导致的账号安全问题，由您自行承担责任。如发现账号被盗用或存在安全风险，请立即联系我们。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">2.3 账号使用</h3>
        <p>
          您的账号仅限本人使用，不得转让、出售或许可他人使用。如我们发现账号使用者并非注册人本人，有权暂停或终止该账号的服务。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">2.4 账号注销</h3>
        <p>
          您可以申请注销账号。账号注销后，我们将删除或匿名化处理您的个人信息（法律法规另有规定的除外），您将无法恢复账号相关的任何数据。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">三、用户行为规范</h2>
        <h3 className="mb-3 mt-6 text-lg font-medium">3.1 内容合规要求</h3>
        <p>您在使用 MultiPost 发布内容时，<strong>不得发布以下类型的内容</strong>：</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>违反宪法所确定的基本原则的内容</li>
          <li>危害国家安全、泄露国家秘密、颠覆国家政权、破坏国家统一的内容</li>
          <li>损害国家荣誉和利益的内容</li>
          <li>煽动民族仇恨、民族歧视，破坏民族团结的内容</li>
          <li>破坏国家宗教政策，宣扬邪教和封建迷信的内容</li>
          <li>散布谣言，扰乱社会秩序，破坏社会稳定的内容</li>
          <li>散布淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的内容</li>
          <li>侮辱或者诽谤他人，侵害他人名誉权、隐私权、肖像权、知识产权或其他合法权益的内容</li>
          <li>法律、行政法规禁止的其他内容</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">3.2 平台使用规范</h3>
        <p>您在使用 MultiPost 时，<strong>不得进行以下行为</strong>：</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>使用 MultiPost 进行任何违法活动</li>
          <li>干扰或破坏 MultiPost 服务或与之相连的服务器和网络</li>
          <li>尝试未经授权访问 MultiPost 的系统或用户账号</li>
          <li>利用 MultiPost 发送垃圾信息或进行恶意营销</li>
          <li>使用自动化工具（非官方扩展）批量操作 MultiPost 服务</li>
          <li>对 MultiPost 进行反向工程、反编译或反汇编（开源代码除外）</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">3.3 第三方平台规则</h3>
        <p>
          使用 MultiPost 发布内容时，您还需遵守各目标社交媒体平台的用户协议和社区规范。因违反第三方平台规则导致的账号封禁、内容删除等后果，由您自行承担。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">四、付费服务</h2>
        <h3 className="mb-3 mt-6 text-lg font-medium">4.1 积分系统</h3>
        <p>
          MultiPost 采用积分（Credit）系统提供部分付费功能。您可以通过 Stripe 或支付宝充值获取积分。积分可用于：
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>AI 辅助创作</li>
          <li>图片生成</li>
          <li>海报生成</li>
          <li>视频文案提取</li>
          <li>其他付费功能</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">4.2 定价说明</h3>
        <p>
          各项付费功能的具体价格将在使用前明确展示。我们保留调整定价的权利，调整后的价格将在网站上公布。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">4.3 退款政策</h3>
        <p>
          <strong>数字化服务不适用无理由退款。</strong>积分一经充值成功，原则上不予退款。但以下情况除外：
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>因我们的技术问题导致服务无法正常使用</li>
          <li>法律法规规定必须退款的情形</li>
        </ul>
        <p className="mt-2">
          如需申请退款，请联系我们的客服团队。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">五、知识产权</h2>
        <h3 className="mb-3 mt-6 text-lg font-medium">5.1 我们的知识产权</h3>
        <p>
          MultiPost 的软件、网站、商标、技术及相关材料的知识产权归我们所有。未经书面许可，您不得复制、修改、分发或创建衍生作品（开源代码按其许可证另行规定）。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">5.2 开源许可</h3>
        <p>
          MultiPost 浏览器扩展采用开源许可发布，您可以按照开源许可证的规定使用、修改和分发源代码。详情请查看 GitHub 仓库中的 LICENSE 文件。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">5.3 用户内容</h3>
        <p>
          您通过 MultiPost 发布的内容，其知识产权归您或原权利人所有。您授权我们为提供服务之目的，对您的内容进行必要的技术处理（如格式转换、存储等）。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">六、免责声明</h2>
        <h3 className="mb-3 mt-6 text-lg font-medium">6.1 服务可用性</h3>
        <p>
          <strong>我们会尽最大努力提供稳定的服务，但不保证服务不会中断或完全没有错误。</strong>因以下原因导致的服务中断，我们不承担责任：
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>系统维护、升级或故障</li>
          <li>网络攻击或恶意程序</li>
          <li>第三方平台（如社交媒体网站）的变更或故障</li>
          <li>不可抗力因素（如自然灾害、政策变化等）</li>
        </ul>

        <h3 className="mb-3 mt-6 text-lg font-medium">6.2 第三方平台</h3>
        <p>
          <strong>MultiPost 依赖第三方社交媒体平台提供发布功能。</strong>我们不对第三方平台的可用性、政策变更或任何第三方行为负责。若第三方平台的变更导致 MultiPost 功能受限，我们将尽力适配，但不保证所有功能始终可用。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">6.3 用户内容</h3>
        <p>
          <strong>我们不对用户通过 MultiPost 发布的内容进行预先审核。</strong>您发布的内容产生的任何法律责任由您自行承担。
        </p>

        <h3 className="mb-3 mt-6 text-lg font-medium">6.4 AI 生成内容</h3>
        <p>
          MultiPost 提供的 AI 辅助创作功能生成的内容仅供参考。<strong>我们不保证 AI 生成内容的准确性、完整性或适用性。</strong>您应在使用前自行核实 AI 生成的内容。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">七、违约处理</h2>
        <p>
          如您违反本协议约定，我们有权采取以下一项或多项措施：
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>警告通知</li>
          <li>暂停或限制您使用部分功能</li>
          <li>暂停或终止您的账号</li>
          <li>删除违规内容</li>
          <li>向相关部门报告并配合调查</li>
          <li>依法追究法律责任</li>
        </ul>

        <h2 className="mb-4 mt-8 text-xl font-semibold">八、协议变更</h2>
        <p>
          我们保留随时修改本协议的权利。修改后的协议将在网站上公布，并更新&ldquo;最近更新时间&rdquo;。您继续使用我们的服务即表示接受修改后的协议。如您不同意修改内容，请停止使用我们的服务。
        </p>

        <h2 className="mb-4 mt-8 text-xl font-semibold">九、法律适用与争议解决</h2>
        <p>
          9.1 本协议的订立、生效、解释、修订、补充、终止、执行与争议解决，均适用中华人民共和国大陆地区的法律。
        </p>
        <p>
          9.2 因本协议产生的争议，双方应协商解决。协商不成时，双方同意将纠纷提交珠海市香洲区人民法院解决。
        </p>
        <p>
          9.3 本协议任一条款被认定为无效或不可执行，不影响其他条款的效力。
        </p>

        <div className="mt-8 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold">十、联系我们</h2>
          <p className="mb-4">如果您对本服务条款有任何疑问或建议，请通过以下方式联系我们：</p>
          <p className="text-gray-600 dark:text-gray-300">官方 QQ 群：867578227</p>
          <p className="text-gray-600 dark:text-gray-300">电子邮件：support@leaper.one</p>
          <p className="text-gray-600 dark:text-gray-300">GitHub：<a href="https://github.com/leaper-one/MultiPost-Extension" className="text-blue-600 hover:underline dark:text-blue-400" target="_blank" rel="noopener noreferrer">MultiPost-Extension</a></p>
        </div>
      </div>
    </div>
  );
}

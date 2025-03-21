<div align="center">

# MultiPost

![GitHub License Licence GitHub](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars Étoiles GitHub](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity Activité des commits GitHub](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension) [![Website Site web](https://img.shields.io/website?url=https%3A%2F%2Fmultipost.app)](https://multipost.app)

⭐ Si vous trouvez ce projet utile, n'hésitez pas à lui donner une étoile ! Votre soutien nous aide à grandir et à nous améliorer ! ⭐

[English](../README.md) | [中文](README-zh.md) | [日本語](README-jp.md) | [Français](README-fr.md) | [한국어](README-kr.md)

> Une extension de navigateur qui aide les utilisateurs à publier du contenu sur plusieurs plateformes de médias sociaux en un seul clic

</div>

---

## Pour commencer
- [multipost.app](https://multipost.app) - Site officiel
- [Éditeur d'articles MultiPost](https://md.multipost.app/) - [(Dépôt)](https://github.com/leaper-one/multipost-wechat-markdown-editor) - Éditeur en ligne pour créer et publier du contenu sur plusieurs plateformes
- [Extension Chrome - ![Chrome Web Store Version Version du Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhohkaclnjgcikfoaacfgijgjgceofih)](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Users Utilisateurs du Chrome Web Store](https://img.shields.io/chrome-web-store/users/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/dhohkaclnjgcikfoaacfgijgjgceofih)
- [Extension Edge - ![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg) [![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)

## Fonctionnalités principales

- Prise en charge de la publication synchrone sur plus de 10 plateformes principales, notamment Zhihu, Weibo, Xiaohongshu, TikTok, etc.
- Pas de connexion, pas d'inscription, pas de clé API requise. Gratuit !
- Prise en charge de plusieurs types de contenu, y compris le texte, les images et les vidéos
- Prise en charge de l'intégration web, permettant de développer vos propres pages web et de configurer l'automatisation en utilisant les fonctionnalités de publication de l'extension, comme :
  - Capture automatique du contenu web et publication sur plusieurs plateformes
  - Planification des publications
  - Intégration de la génération de contenu par IA

Cette extension résout les difficultés des créateurs de contenu lors de la publication sur plusieurs plateformes. Grâce à une seule édition, le contenu peut être synchronisé sur toutes les plateformes, améliorant considérablement l'efficacité du travail.

## Démarrage

Tout d'abord, lancez le serveur de développement :

```bash
pnpm i

pnpm dev
```

Dans la page des extensions du navigateur, activez le mode développeur, cliquez sur `Charger l'extension non empaquetée` et trouvez `build/chrome-mv3-dev` pour la charger.

## Construction de la version de production

Exécutez la commande suivante :

```bash
pnpm build
```

Vous trouverez le contenu de la construction dans le dossier `build`

## Guide de développement

### Documents à connaître

[Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/api)

[Edge Extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)

[Plasmo Docs](https://docs.plasmo.com/)

## Articles recommandés

- [Guide AI Full Stack Vol.033 : Apprenez la publication multiplateforme en un clic en 5 minutes](https://mp.weixin.qq.com/s/K7yh6EsBLOGJzl8Gh8SwLw)

### Structure des fichiers

> src/sync : Ce dossier contient le code pour opérer sur différentes plateformes, où dynamic est lié à la publication dynamique, et video est lié à la publication vidéo ; toute plateforme ajoutée doit être enregistrée dans common.ts.
> components : Ce dossier contient tous les composants pour les opérations d'interface frontend.

### Environnement de développement

Il est recommandé d'utiliser l'outil de gestion de paquets `pnpm@latest-9` avec Node.js version 20.

## Historique des étoiles

[![Star History Chart](https://api.star-history.com/svg?repos=leaper-one/MultiPost-Extension&type=Date)](https://star-history.com/#leaper-one/MultiPost-Extension&Date)

## Contactez-nous

- Groupe QQ : [921137242](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242)
- Email : support@leaper.one
- Twitter : [@harry_wong_](https://x.com/harry_wong_)
- GitHub Issues : https://github.com/MultiPost-Extension/MultiPost-Extension/issues

![Groupe QQ](MultiPost-Extension_2025-02-28T14_17_15.717Z.png)

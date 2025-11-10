# TT-ChatGPT-Sidebar
ChatGPT Sidebar navigation
Une petite extension Chrome qui ajoute une colonne latérale à ChatGPT, listant toutes vos questions précédentes et leurs réponses associées.
Elle vous permet de naviguer rapidement dans une longue discussion.

**🚀 Installation**
Télécharger le dossier du projet ou le fichier ZIP.
Ouvrir Chrome et aller sur :
chrome://extensions
Activer le Mode développeur (en haut à droite).
Cliquer sur Charger l’extension non empaquetée.
Sélectionner le dossier du projet (contenant manifest.json).

**🧩 Fonctionnalités principales**
📜 Liste toutes vos questions dans une colonne à droite.
🤖 Accès direct à la réponse correspondante.
✏️ Cliquez sur le crayon pour éditer une question existante.
🖱️ Scroll précis : un clic sur une question ou une réponse vous y emmène directement.
🧭 Survol d’une question → aperçu complet du texte.
↔️ Colonne redimensionnable (faites glisser la bordure gauche).
🎨 Mode compact, icônes, et aperçu contextuel.
⚙️ Personnalisation rapide
- Limiter le texte affiché : modifier la constante MAX_CHARS dans content.js.
- Largeur par défaut : modifier state.width dans content.js.
- Couleurs / apparence : personnaliser styles.css.

**💡 Utilisation**
Ouvrez ChatGPT (https://chat.openai.com).
Dans une conversation, la colonne “Mes questions” apparaît automatiquement à droite.

Cliquez :
Sur 🧑 pour scroller vers votre question.
Sur 🤖 pour aller directement à la réponse.
Sur ✏️ pour modifier votre message.
Passez la souris sur une question pour voir son contenu complet.

🔧 Structure du projet
chatgpt-questions-sidebar/
│
├── manifest.json      # Configuration Chrome
├── content.js         # Logique principale
├── styles.css         # Apparence du panneau
├── icon16.png
├── icon48.png
└── icon128.png

🧱 Compatibilité
Navigateur : Google Chrome / Edge Chromium
Site : chat.openai.com
Ne nécessite aucune connexion API ni configuration spéciale.

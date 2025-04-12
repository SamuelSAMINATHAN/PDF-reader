# PDF-Reader Frontend

Interface utilisateur React pour l'application PDF-Reader, permettant de manipuler des fichiers PDF en toute sécurité côté client.

## Fonctionnalités

- Fusionner plusieurs PDF en un seul document
- Diviser un PDF en plusieurs fichiers
- Extraire des pages spécifiques d'un PDF
- Signer des documents PDF
- Et d'autres fonctionnalités à venir...

## Prérequis

- Node.js 14.x ou supérieur
- npm 6.x ou supérieur

## Installation

1. Clonez le dépôt:
```bash
git clone https://github.com/votre-utilisateur/pdf-reader.git
cd pdf-reader/frontend
```

2. Installez les dépendances:
```bash
npm install
```

## Développement

Pour démarrer le serveur de développement:

```bash
npm start
```

L'application sera disponible à l'adresse [http://localhost:3000](http://localhost:3000).

## Construction

Pour construire l'application pour la production:

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `build`.

## Connexion au Backend

L'application frontend est configurée pour se connecter à un backend à l'adresse `http://localhost:8000` via le paramètre `proxy` dans le fichier `package.json`. Assurez-vous que le serveur backend est en cours d'exécution lors de l'utilisation de l'application.

## Sécurité

Toutes les manipulations de fichiers PDF sont effectuées localement dans le navigateur ou côté serveur sans envoi vers des services externes, garantissant ainsi la confidentialité des documents.

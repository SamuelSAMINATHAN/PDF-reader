import React from 'react';
import { Link } from 'react-router-dom';

// Définition des fonctionnalités principales
const features = [
  {
    name: 'Fusionner des PDF',
    description: 'Combinez plusieurs fichiers PDF en un seul document.',
    path: '/merge',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Diviser un PDF',
    description: 'Séparez un PDF en plusieurs fichiers distincts.',
    path: '/split',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    name: 'Extraire des pages',
    description: 'Extrayez des pages spécifiques de votre document PDF.',
    path: '/extract',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
      </svg>
    ),
  },
  {
    name: 'Signer un PDF',
    description: 'Ajoutez votre signature manuscrite ou une image de signature à votre PDF.',
    path: '/sign',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    ),
  },
  // Fonctionnalités à venir (commentées pour le moment)
  /*
  {
    name: 'Supprimer des pages',
    description: 'Supprimez des pages spécifiques d\'un document PDF.',
    path: '/remove',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    name: 'Réorganiser les pages',
    description: 'Changez l\'ordre des pages dans un document PDF par glisser-déposer.',
    path: '/reorder',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
      </svg>
    ),
  },
  {
    name: 'Compresser un PDF',
    description: 'Réduisez la taille de vos fichiers PDF tout en préservant la qualité.',
    path: '/compress',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    name: 'Convertir des images en PDF',
    description: 'Transformez vos images JPG, PNG et autres formats en PDF.',
    path: '/convert',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
    ),
  },
  */
];

const Home: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">PDF-Reader</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Manipulez vos fichiers PDF en toute sécurité et sans connexion internet.
          Tous les traitements sont effectués localement sur votre ordinateur.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <Link
              key={feature.path}
              to={feature.path}
              className="flex p-6 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0 mr-4">{feature.icon}</div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{feature.name}</h3>
                <p className="mt-1 text-gray-600">{feature.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">Mode ultra sécurisé</h2>
        <p className="text-blue-700">
          Tous vos fichiers sont traités localement et ne sont jamais envoyés vers des serveurs externes.
          Ils sont supprimés automatiquement après traitement pour garantir votre confidentialité.
        </p>
      </div>
    </div>
  );
};

export default Home;

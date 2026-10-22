import type { Contributor } from '../lib/types';

export const CONTRIBUTORS: Contributor[] = [
  {
    id: 'traditional',
    name: 'Traditional (oral)',
    role: 'author',
    languages: ['hi', 'te', 'kn', 'mr', 'ml', 'ta', 'gu', 'or'],
    bio: 'Stories carried by grandmothers, wandering bards and temple storytellers for centuries before anyone wrote them down. Every retelling changes them a little; that is how they stay alive.',
  },
  {
    id: 'premchand',
    name: 'Munshi Premchand',
    role: 'author',
    languages: ['hi', 'ur'],
    lifespan: '1880–1936',
    bio: 'Born Dhanpat Rai Srivastava near Varanasi, Premchand wrote some 300 short stories and a dozen novels in Hindi and Urdu. He turned Hindustani fiction toward the lives of villagers, widows, debtors and children, and is often called the father of the modern Hindi short story.',
  },
  {
    id: 'tagore',
    name: 'Rabindranath Tagore',
    role: 'author',
    languages: ['bn'],
    lifespan: '1861–1941',
    bio: 'Poet, novelist, composer and educator from Calcutta, and the first non-European to win the Nobel Prize in Literature (1913). His Bengali short stories, many written while managing family estates in rural East Bengal, are among the earliest modern short fiction in India.',
  },
  {
    id: 'waris-shah',
    name: 'Waris Shah',
    role: 'author',
    languages: ['pa'],
    lifespan: 'c. 1722–1798',
    bio: 'Sufi poet from Jandiala Sher Khan in the Punjab whose 1766 verse rendering of Heer Ranjha became the definitive version of the legend, still sung across both sides of the border.',
  },
  {
    id: 'dakshinaranjan',
    name: 'Dakshinaranjan Mitra Majumder',
    role: 'author',
    languages: ['bn'],
    lifespan: '1877–1957',
    bio: 'Collected the fairy tales told by village women in Bengal and published them as Thakurmar Jhuli ("Grandmother\'s Bag of Tales", 1907), with a foreword by Tagore.',
  },
  {
    id: 'bezbaroa',
    name: 'Lakshminath Bezbaroa',
    role: 'author',
    languages: ['as'],
    lifespan: '1864–1938',
    bio: 'A founding figure of modern Assamese literature. His collection Burhi Aair Xadhu ("Grandmother\'s Tales", 1911) preserved the folk tales of the Brahmaputra valley.',
  },
  {
    id: 'vishnu-sharma',
    name: 'Vishnu Sharma (attrib.)',
    role: 'author',
    languages: ['sa'],
    lifespan: 'c. 300 BCE',
    bio: 'The Panchatantra is attributed to Vishnu Sharma, said to have composed its animal fables to teach statecraft to three dull princes. It became one of the most translated books in the world.',
  },
  {
    id: 'litbridge-community',
    name: 'LitBridge Community',
    role: 'translator',
    languages: ['hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'ur', 'as', 'sa'],
    bio: 'Volunteer translators and readers who draft, review and vote on every retelling in the library. Submissions that reach the approval threshold are edited and added to the catalogue.',
  },
  {
    id: 'litbridge-editorial',
    name: 'LitBridge Editorial',
    role: 'curator',
    languages: ['hi', 'bn', 'ur', 'pa'],
    bio: 'The editorial team checks rights status, cultural notes and narration scripts before a work goes live.',
  },
];

export const CONTRIBUTOR_BY_ID = Object.fromEntries(CONTRIBUTORS.map((c) => [c.id, c]));

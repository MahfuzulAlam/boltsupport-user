import type { Article, Category, Collection, SavedReply } from '@/types'
import { minutesBefore } from '@/lib/rand'
import { SEED_NOW } from './clock'

export const collections: Collection[] = [
  {
    id: 'col1',
    name: 'Getting started',
    domain: 'docs.boltsupport.io',
    private: false,
    articleCount: 4,
  },
  { id: 'col2', name: 'Billing', domain: 'docs.boltsupport.io', private: false, articleCount: 4 },
  {
    id: 'col3',
    name: 'Internal runbooks',
    domain: 'docs.boltsupport.io',
    private: true,
    articleCount: 2,
  },
]

export const categories: Category[] = [
  { id: 'cat1', collectionId: 'col1', name: 'Setup', articleCount: 2 },
  { id: 'cat2', collectionId: 'col1', name: 'Teams and access', articleCount: 2 },
  { id: 'cat3', collectionId: 'col2', name: 'Plans', articleCount: 2 },
  { id: 'cat4', collectionId: 'col2', name: 'Payments', articleCount: 2 },
  { id: 'cat5', collectionId: 'col3', name: 'Escalation', articleCount: 2 },
]

interface ArticleSeed {
  id: string
  collectionId: string
  categoryId: string | null
  title: string
  body: string
  status: 'draft' | 'published'
  keywords: string[]
  minutesAgo: number
}

const ARTICLE_SEEDS: ArticleSeed[] = [
  {
    id: 'a1',
    collectionId: 'col1',
    categoryId: 'cat1',
    title: 'Connect your first inbox',
    body: 'Forward your support address to the inbox BoltSupport gives you, then send a test message to confirm it arrives.',
    status: 'published',
    keywords: ['setup', 'inbox', 'forwarding'],
    minutesAgo: 12_400,
  },
  {
    id: 'a2',
    collectionId: 'col1',
    categoryId: 'cat1',
    title: 'SAML setup',
    body: 'SSO is available on the Team plan and above. Upload your identity provider metadata under Manage, then Channels, then SSO.',
    status: 'published',
    keywords: ['sso', 'saml', 'security'],
    minutesAgo: 9_800,
  },
  {
    id: 'a3',
    collectionId: 'col1',
    categoryId: 'cat2',
    title: 'Add a teammate without billing access',
    body: 'Invite the teammate as an agent. Agents can work the queue but cannot see invoices or change the plan.',
    status: 'published',
    keywords: ['permissions', 'roles', 'invite'],
    minutesAgo: 4_100,
  },
  {
    id: 'a4',
    collectionId: 'col1',
    categoryId: 'cat2',
    title: 'Roles and permissions',
    body: 'Owners manage billing and the workspace. Admins manage inboxes and settings. Agents work conversations.',
    status: 'published',
    keywords: ['roles', 'permissions'],
    minutesAgo: 3_050,
  },
  {
    id: 'a5',
    collectionId: 'col2',
    categoryId: 'cat3',
    title: 'Refund policy',
    body: 'Refunds are available within 30 days of a charge. Duplicate charges are refunded in full to the original card.',
    status: 'published',
    keywords: ['refund', 'billing', 'policy'],
    minutesAgo: 2_600,
  },
  {
    id: 'a6',
    collectionId: 'col2',
    categoryId: 'cat3',
    title: 'Switch to annual billing',
    body: 'Open Billing, choose Annual, then confirm. The remaining month is credited against the new term.',
    status: 'published',
    keywords: ['annual', 'upgrade', 'plans'],
    minutesAgo: 1_900,
  },
  {
    id: 'a7',
    collectionId: 'col2',
    categoryId: 'cat4',
    title: 'Card declines and issuer codes',
    body: 'A 402 with issuer code 05 means the bank declined the charge. Ask the customer to authorise the amount, then retry.',
    status: 'published',
    keywords: ['402', 'decline', 'issuer', 'card'],
    minutesAgo: 820,
  },
  {
    id: 'a8',
    collectionId: 'col2',
    categoryId: 'cat4',
    title: 'Export invoices and the audit log',
    body: 'Invoices export as PDF from Billing. The audit log exports as CSV from Manage, then Audit log.',
    status: 'draft',
    keywords: ['export', 'csv', 'audit'],
    minutesAgo: 240,
  },
  {
    id: 'a9',
    collectionId: 'col3',
    categoryId: 'cat5',
    title: 'Escalating a webhook outage',
    body: 'Confirm the retry queue depth, then page the on call engineer. Do not promise a fix window to the customer.',
    status: 'published',
    keywords: ['webhook', 'escalation', 'oncall'],
    minutesAgo: 6_600,
  },
  {
    id: 'a10',
    collectionId: 'col3',
    categoryId: 'cat5',
    title: 'When to offer quarterly billing',
    body: 'If an issuer blocks a single annual charge, quarterly at the annual rate keeps the discount without a new approval.',
    status: 'published',
    keywords: ['quarterly', 'billing', 'workaround'],
    minutesAgo: 5_400,
  },
]

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const articles: Article[] = ARTICLE_SEEDS.map((seed) => ({
  id: seed.id,
  collectionId: seed.collectionId,
  categoryId: seed.categoryId,
  title: seed.title,
  slug: toSlug(seed.title),
  bodyHtml: `<p>${seed.body}</p>`,
  status: seed.status,
  updatedAt: minutesBefore(SEED_NOW, seed.minutesAgo),
  keywords: seed.keywords,
  relatedIds: [],
  // A couple of articles arrive tagged so the panel has something in it on first open.
  tagIds: seed.id === 'a1' ? ['t4'] : seed.id === 'a2' ? ['t4', 't5'] : [],
  seo: {
    titleTag: `${seed.title} | BoltSupport`,
    metaDescription: seed.body.slice(0, 155),
  },
}))

export const savedReplies: SavedReply[] = [
  {
    id: 'sr1',
    name: 'Shipping delay',
    bodyHtml:
      '<p>Thanks for your patience. Your order is running behind and we expect it to move within two business days.</p>',
    usageCount: 148,
  },
  {
    id: 'sr2',
    name: 'Refund started',
    bodyHtml:
      '<p>I have started the refund. It usually reaches your bank within five to ten business days.</p>',
    usageCount: 96,
  },
  {
    id: 'sr3',
    name: 'Ask for account details',
    bodyHtml:
      '<p>So I can look into this, could you confirm the email on the account and the date of the charge?</p>',
    usageCount: 71,
  },
  {
    id: 'sr4',
    name: 'SSO metadata request',
    bodyHtml:
      '<p>Could you send the identity provider metadata XML? I will confirm the mapping once I have it.</p>',
    usageCount: 34,
  },
]

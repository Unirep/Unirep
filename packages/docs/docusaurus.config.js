// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github')
const darkCodeTheme = require('prism-react-renderer/themes/dracula')

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'UniRep Docs',
    tagline: 'Universal Reputation',
    url: 'https://developer.unirep.io',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/unirep-icon.png',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'Unirep', // Usually your GitHub org/user name.
    projectName: 'Unirep', // Usually your repo name.

    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve('./sidebars.js'),
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        'https://github.com/Unirep/Unirep/tree/main/packages/docs',
                    lastVersion: '2.0.0-beta-1',
                    versions: {
                        current: {
                            label: 'next',
                            path: 'next',
                        },
                    },
                },
                blog: {
                    showReadingTime: true,
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        'https://github.com/Unirep/Unirep/tree/main/packages/docs',
                },
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            }),
        ],
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            navbar: {
                title: 'Universal Reputation',
                logo: {
                    alt: 'UniRep logo',
                    src: 'img/unirep-icon.png',
                },
                items: [
                    {
                        type: 'doc',
                        docId: 'welcome',
                        position: 'left',
                        label: 'API',
                    },
                    { to: '/blog', label: 'Blog', position: 'left' },
                    {
                        type: 'docsVersionDropdown',
                        dropdownActiveClassDisabled: true,
                        position: 'right',
                    },
                    {
                        href: 'https://github.com/unirep/unirep',
                        label: 'GitHub',
                        position: 'right',
                    },
                ],
            },
            footer: {
                links: [
                    {
                        title: 'Docs',
                        items: [
                            {
                                label: 'Welcome',
                                to: '/docs/welcome',
                            },
                        ],
                    },
                    {
                        title: 'Community',
                        items: [
                            {
                                label: 'Discord',
                                href: 'https://discord.gg/VzMMDJmYc5',
                            },
                            {
                                label: 'Twitter',
                                href: 'https://twitter.com/UniRep_protocol',
                            },
                        ],
                    },
                    {
                        title: 'More',
                        items: [
                            {
                                label: 'Blog',
                                to: '/blog',
                            },
                            {
                                label: 'GitHub',
                                href: 'https://github.com/unirep',
                            },
                        ],
                    },
                ],
                copyright: `MIT licensed ✨`,
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme,
                additionalLanguages: ['typescript', 'solidity'],
            },
        }),
    plugins: [
        function svgFix() {
            return {
                name: 'svg-fix',
                configureWebpack(config) {
                    const svgRuleIndex = config.module.rules.findIndex((r) =>
                        r.test.test('file.svg')
                    )
                    const svgrConfigIndex = config.module.rules[
                        svgRuleIndex
                    ].oneOf.findIndex((r) => {
                        if (!Array.isArray(r.use) || r.use.length === 0)
                            return false
                        return r.use[0].loader.indexOf('@svgr/webpack') !== -1
                    })
                    if (svgRuleIndex === -1 || svgrConfigIndex === -1) return

                    config.module.rules[svgRuleIndex].oneOf[
                        svgrConfigIndex
                    ].use[0].options.svgoConfig.plugins[0].params.overrides.cleanupIDs = false
                },
            }
        },
    ],
}

module.exports = config

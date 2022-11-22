import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import HomepageFeatures from '@site/src/components/HomepageFeatures'

import styles from './index.module.css'

const HeroImage = require('@site/static/img/img-hero.svg').default
const FooterImage = require('@site/static/img/img-footer.svg').default

function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <header className={clsx('hero hero--primary', styles.heroBanner)}>
            <div
                style={{
                    display: 'flex',
                    margin: 'auto',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        maxWidth: '534px',
                        textAlign: 'left',
                        margin: '0px 16px',
                    }}
                >
                    <div className={clsx(styles.titleText)}>
                        Universal Reputation
                    </div>
                    <div style={{ height: '24px' }} />
                    <div className={clsx(styles.subtitleText)}>
                        UniRep protocol is a private and non-repudiable
                        reputation system.
                    </div>
                    <div style={{ height: '24px' }} />
                    <Link className={clsx(styles.apiButton)} to="/docs/welcome">
                        Get Started
                    </Link>
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        maxWidth: 'min(761px, 50vw)',
                    }}
                >
                    <HeroImage className={styles.heroImage} role="img" />
                </div>
            </div>
        </header>
    )
}

export default function Home() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout
            title={`${siteConfig.title}`}
            description="Universal Reputation is an anonymous reputation protocol."
        >
            <HomepageHeader />
            <main>
                <HomepageFeatures />
            </main>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <FooterImage
                    height="auto"
                    className={styles.footerImage}
                    role="img"
                />
            </div>
        </Layout>
    )
}

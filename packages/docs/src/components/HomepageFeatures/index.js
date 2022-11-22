import React from 'react'
import clsx from 'clsx'
import styles from './styles.module.css'

const DescriptionImage =
    require('@site/static/img/description-image.svg').default

const FeatureList = [
    {
        title: 'Extensible',
        description: (
            <>
                UniRep is designed to be extended to fulfill the needs of any
                application. The smart contracts, ZK circuits, and data
                structures are all built with extensibility in mind.
            </>
        ),
    },
    {
        title: 'Anonymous',
        description: (
            <>
                UniRep gives users true anonymity using short lived psuedonyms.
                A single user has a number of valid identifiers at any given
                time. These identifiers will change over time. The user can
                always retroactively prove control of old identifiers in ZK.
            </>
        ),
    },
    {
        title: 'Interoperable',
        description: (
            <>
                A standard protocol for reputation allows applications to
                interoperate with each other by verifying common proofs. This
                can happen offchain using protocols like http or ipfs; and can
                also happen onchain by verifying a ZK proof in a smart contract.
            </>
        ),
    },
]

function Feature({ title, description }) {
    return (
        <div className={styles.featureContainer}>
            <h3 className={styles.featureTitle}>{title}</h3>
            <p className={styles.featureDescription}>{description}</p>
        </div>
    )
}

export default function HomepageFeatures() {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                marginTop: 'min(130px, 10vw)',
            }}
        >
            <DescriptionImage className={styles.descriptionImage} />
            <section className={styles.features}>
                <div className="container">
                    {FeatureList.map((f) => (
                        <Feature {...f} />
                    ))}
                </div>
            </section>
        </div>
    )
}

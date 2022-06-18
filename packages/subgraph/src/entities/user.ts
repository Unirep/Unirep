import { ethereum } from '@graphprotocol/graph-ts'
import { UserEntity } from '../../generated/schema'

export function createOrLoadUser(event: ethereum.Event): UserEntity {
    const userAddress = event.transaction.from
    let userEntity = UserEntity.load(userAddress.toHex())

    if (userEntity == null) {
        userEntity = new UserEntity(userAddress.toHex())
    }

    userEntity.id = userAddress.toHex()
    userEntity.save()

    return userEntity
}

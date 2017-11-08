<?php

namespace QUI\Auth\Google;

use QUI\Users\User;

/**
 * Class Events
 */
class Events
{
    /**
     * quiqqer/quiqqer: onUserDelete
     *
     * @param User $User
     * @return void
     */
    public static function onUserDelete(User $User)
    {
        Google::disconnectAccount($User->getId(), false);
    }
}

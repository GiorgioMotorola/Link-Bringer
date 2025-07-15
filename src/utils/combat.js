export function handleCombatAction({ player, enemy, state, utils }) {
  const {
    playerHP,
    playerClass,
    specialUsesLeft,
    weaponBonus,
    shieldBonus,
    playerName,
    action: playerAction,
  } = player;

  const {
    enemyHP,
    encounter,
    nextEnemyAttack,
    enemyNextAction,
    enemyIsStunned,
  } = enemy;

  const { log, formattedTitle, DEFAULT_ENEMY_HP, isBoss } = state;

  const {
    clearTimer,
    setDefeated,
    handleLootDrop,
    markBossDefeated,
    gotoEnemyTurn,
  } = utils;

  let currentEnemyDamage = nextEnemyAttack.value;
  if (typeof currentEnemyDamage !== "number" || isNaN(currentEnemyDamage)) {
    console.warn(
      "nextEnemyAttack.value is not a number, defaulting to 1.",
      currentEnemyDamage
    );
    currentEnemyDamage = 1;
  }

  let damageToPlayer = 0;
  let damageToEnemy = 0;
  let skipEnemyCurrentTurn = false;
  let playerDefendedThisTurn = false;

  console.log("DEBUG: Player Action:", playerAction);
  console.log(
    "DEBUG: Enemy Next Action (for this turn):",
    enemyNextAction.value
  );
  console.log("DEBUG: Initial playerHP:", playerHP.value);
  console.log("DEBUG: Initial enemyHP:", enemyHP.value);

  if (playerAction === "attack") {
    let randomDamage = Math.floor(Math.random() * 5) + 2;
    if (playerClass.value.name === "Fighter") randomDamage += 1;
    if (playerClass.value.name === "Rogue" && Math.random() < 0.25) {
      randomDamage += 3;
      log(
        `<span class="player-name">${playerName.value}</span> lands a critical strike.`
      );
    }
    if (weaponBonus.value > 0) {
      randomDamage += weaponBonus.value;
    }
    damageToEnemy = randomDamage;
    log(
      `🗡️ <span class="player-name">${playerName.value}</span> hits ${formattedTitle} for ${damageToEnemy} damage.`
    );
  } else if (playerAction === "special") {
    if (specialUsesLeft.value <= 0) {
      log(
        `<span class="player-name">${playerName.value}</span> is out of ${playerClass.value.special} charges.`
      );
      return;
    }
    specialUsesLeft.value--;

    const cls = playerClass.value.name;
    const specialName = playerClass.value.special;

    let baseSpecialDamage = 0;

    if (cls === "Fighter") {
      baseSpecialDamage = 6;
      damageToEnemy = baseSpecialDamage;
      log(
        `⚔️ <span class="player-name">${playerName.value}</span> unleashes **${specialName}** for ${baseSpecialDamage} damage.`
      );
    } else if (cls === "Wizard") {
      const effect = playerClass.value.specialEffect(
        enemyHP.value,
        playerHP.value
      );
      baseSpecialDamage = effect.wizardDamage;
      damageToEnemy = baseSpecialDamage;
      playerHP.value = effect.playerHP;

      log(
        `🔥 <span class="player-name">${
          playerName.value
        }</span> casts **${specialName}**, dealing ${baseSpecialDamage} damage.${
          effect.stunned ? ` The enemy is stunned.` : ""
        }`
      );
      if (effect.stunned) {
        enemyIsStunned.value = true;
        enemyNextAction.value = null;
        skipEnemyCurrentTurn = true;
      }
    } else if (cls === "Rogue") {
      const effect = playerClass.value.specialEffect(
        enemyHP.value,
        DEFAULT_ENEMY_HP
      );
      baseSpecialDamage = effect.rogueDamage;
      damageToEnemy = baseSpecialDamage;
      damageToPlayer = 0;
      skipEnemyCurrentTurn = true;

      log(
        `🗡️ <span class="player-name">${playerName.value}</span> disappears and executes **${specialName}** for ${baseSpecialDamage} damage.`
      );
    } else if (cls === "Paladin") {
      baseSpecialDamage = 5;
      damageToEnemy = baseSpecialDamage;
      const effect = playerClass.value.specialEffect(
        enemyHP.value,
        playerHP.value,
        playerClass.value.maxHP
      );
      playerHP.value = effect.playerHP;
      log(
        `✨ <span class="player-name">${
          playerName.value
        }</span> calls upon **${specialName}**, dealing ${baseSpecialDamage} damage and restoring ${
          playerHP.value - player.playerHP.value + damageToPlayer
        } HP.`
      );
    } else if (cls === "Cleric") {
      baseSpecialDamage = 6;
      damageToEnemy = baseSpecialDamage;
      const effect = playerClass.value.specialEffect(
        enemyHP.value,
        playerHP.value,
        playerClass.value.maxHP
      );
      playerHP.value = effect.playerHP;

      log(
        `🙏 <span class="player-name">${playerName.value}</span> invokes **${specialName}**, healing 5 HP and dealing ${baseSpecialDamage} damage.`
      );
    } else if (cls === "Sorcerer") {
      baseSpecialDamage = 12;
      damageToEnemy = baseSpecialDamage;
      const effect = playerClass.value.specialEffect(
        enemyHP.value,
        playerHP.value
      );

      playerHP.value = effect.playerHP;

      log(
        `💥 <span class="player-name">${playerName.value}</span> unleashes **${specialName}**, dealing ${baseSpecialDamage} damage but taking recoil.`
      );
    } else {
      log(
        `<span class="player-name">${playerName.value}</span> uses ${specialName}.`
      );
      if (playerClass.value.specialEffect) {
        const effect = playerClass.value.specialEffect(
          enemyHP.value,
          playerHP.value,
          playerClass.value.maxHP
        );
        if (typeof effect === "object" && effect !== null) {
          if (effect.playerHP !== undefined) {
            playerHP.value = effect.playerHP;
          }
          if (effect.enemyDamage !== undefined) {
            damageToEnemy = effect.enemyDamage;
          }
          if (effect.stunned) {
            enemyIsStunned.value = true;
            enemyNextAction.value = null;
          }
          if (effect.skipEnemyTurn) {
            skipEnemyCurrentTurn = true;
          }
        }
      }
    }
  } else if (playerAction === "defend") {
    log(
      `🛡️ <span class="player-name">${playerName.value}</span> braces for impact.`
    );
    playerDefendedThisTurn = true;
  } else if (playerAction === "flee") {
    if (isBoss(encounter.value?.enemy)) {
      log(`You cannot flee from ${encounter.value?.enemy?.name}.`);
    } else {
      if (Math.random() > 0.4) {
        log(
          `🏃 <span class="player-name">${playerName.value}</span> fled successfully.`
        );
        encounter.value = null;
        return;
      } else {
        log(
          `<span class="player-name">${playerName.value}</span> failed to flee.`
        );
      }
    }
  }

  if (damageToEnemy > 0) {
    let finalDamageToEnemy = damageToEnemy;

    if (
      enemyNextAction.value === "defend" &&
      !(playerAction === "special" && playerClass.value.name === "Rogue")
    ) {
      finalDamageToEnemy = Math.floor(finalDamageToEnemy * 0.5);
      log(`🛡️ ${formattedTitle} defends, reducing incoming damage.`);
    }
    enemyHP.value -= finalDamageToEnemy;
  }

  if (enemyHP.value <= 0) {
    log(
      `💀 <span class="player-name">${playerName.value}</span> defeated ${formattedTitle}`
    );
    const defeatedEnemyData = encounter.value?.enemy;
    encounter.value = null;
    handleLootDrop();
    if (isBoss(defeatedEnemyData)) {
      markBossDefeated();
    }
    return;
  }

  if (!skipEnemyCurrentTurn) {
    if (enemyIsStunned.value) {
      log(`💤 ${formattedTitle} is stunned and skips their turn.`);
      enemyIsStunned.value = false;
      damageToPlayer = 0;
    } else {
      if (enemyNextAction.value === "attack") {
        damageToPlayer = currentEnemyDamage;

         damageToPlayer = Math.max(0, damageToPlayer - Math.floor(shieldBonus.value / 2));

        if (playerDefendedThisTurn) {
          damageToPlayer = Math.max(0, Math.floor(damageToPlayer * 0.7));
          log(
            `🛡️ <span class="player-name">${playerName.value}</span> defended, taking ${damageToPlayer} damage.`
          );
        } else {
          log(
            `💥 ${formattedTitle} attacks! <span class="player-name">${playerName.value}</span> takes ${damageToPlayer} damage.`
          );
        }
      } else if (enemyNextAction.value === "trip") {
        log(`🤾 ${formattedTitle} trips. You get a free hit.`);
        damageToPlayer = 0;
      } else if (enemyNextAction.value === "flee") {
        log(`🏃 ${formattedTitle} flees.`);
        encounter.value = null;
        return;
      } else if (enemyNextAction.value === "defend") {
        log(`🛡️ ${formattedTitle} is defending your next attack.`);
        damageToPlayer = 0;
      }
    }
  } else {
    damageToPlayer = 0;
    console.log(
      "DEBUG: Enemy current turn skipped due to player's Class Ability action."
    );
  }

  if (typeof damageToPlayer === "number" && !isNaN(damageToPlayer)) {
    playerHP.value = Math.max(playerHP.value - damageToPlayer, 0);
  } else {
    console.error(
      "ERROR: damageToPlayer is not a valid number, defaulting to 0 damage.",
      damageToPlayer
    );
    playerHP.value = Math.max(playerHP.value - 0, 0);
  }

  console.log("DEBUG: playerHP after this turn:", playerHP.value);
  console.log("DEBUG: enemyHP after this turn:", enemyHP.value);

  if (playerHP.value <= 0) {
    log(
      `💀 <span class="player-name">${playerName.value}</span> was defeated.`
    );
    encounter.value = null;
    clearTimer();
    setDefeated();
    return;
  }

  gotoEnemyTurn();
}

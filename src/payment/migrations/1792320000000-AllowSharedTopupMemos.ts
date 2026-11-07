import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowSharedTopupMemos1792320000000 implements MigrationInterface {
  name = 'AllowSharedTopupMemos1792320000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const uniqueMemoIndexes: Array<{ INDEX_NAME: string }> = await queryRunner.query(
      `SELECT INDEX_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'stellar_payment_instructions'
         AND NON_UNIQUE = 0
       GROUP BY INDEX_NAME
       HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME = 'memo') = 1`,
    );

    for (const { INDEX_NAME: indexName } of uniqueMemoIndexes) {
      await queryRunner.query(
        `ALTER TABLE \`stellar_payment_instructions\` DROP INDEX \`${indexName.replace(/`/g, '``')}\``,
      );
    }

    const memoIndex = await queryRunner.query(
      `SELECT INDEX_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'stellar_payment_instructions'
         AND INDEX_NAME = 'IDX_stellar_payment_instructions_memo'`,
    );
    if (memoIndex.length === 0) {
      await queryRunner.query(
        'CREATE INDEX `IDX_stellar_payment_instructions_memo` ON `stellar_payment_instructions` (`memo`)',
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_stellar_payment_instructions_memo` ON `stellar_payment_instructions`',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_stellar_payment_instructions_memo` ON `stellar_payment_instructions` (`memo`)',
    );
  }
}
<?php
/**
 * Test file for InsertRuleData
 *
 * @package Accessibility_Checker
 */

use EDAC\Admin\Insert_Rule_Data;

/**
 * Test class for InsertRuleData
 */
class InsertRuleDataTest extends WP_UnitTestCase {

	/**
	 * Create table to test against.
	 *
	 * @return void
	 */
	public function setUp(): void {
		parent::setUp();
		global $wpdb;
		$this->table_name = $wpdb->prefix . 'accessibility_checker';

		// Use the Update_Database class to create/update the table schema.
		require_once dirname( __DIR__, 3 ) . '/admin/class-update-database.php';
		$update_db = new \EDAC\Admin\Update_Database();
		$update_db->edac_update_database();
	}

	/**
	 * Cleans up the table after each test.
	 *
	 * @return void
	 */
	public function tearDown(): void {
		global $wpdb;
		$wpdb->query( "DROP TABLE IF EXISTS $this->table_name" ); // phpcs:ignore WordPress.DB -- Table name is safe and not caching in a test.
		parent::tearDown();
	}

	/**
	 * Tests the insert method would return expected data types.
	 */
	public function testRuleInserterReturnLogic() {
		$post     = $this->factory()->post->create_and_get();
		$rule     = 'rule';
		$ruletype = 'ruletype';
		$rule_obj = 'rule_obj';

		global $wpdb;

		$rule_inserter     = new Insert_Rule_Data();
		$initial_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.

		// call should return int as a successful insert.
		$new_data = $rule_inserter->insert( $post, $rule, $ruletype, $rule_obj );
		$this->assertIsInt( $new_data );
		// second call is a duplicate and should return null.
		$duplicate_data = $rule_inserter->insert( $post, $rule, $ruletype, $rule_obj );
		$this->assertEquals( null, $duplicate_data );

		// check if the row count has increased by 1.
		$current_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.
		$this->assertEquals( $initial_row_count + 1, $current_row_count );

		// should return null as ruletype is 'revision'.
		$revision_type_return = $rule_inserter->insert( $post, $rule, 'revision', $rule_obj );
		$this->assertEquals( null, $revision_type_return );

		// should throw an exception because of missing parameters.
		$this->expectException( TypeError::class );
		$rule_inserter->insert(); // phpcs:ignore -- intentionally passing something that will cause an exception.

		// check that row count has not increased since last check.
		$current_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.
		$this->assertEquals( $initial_row_count + 1, $current_row_count );
	}

	/**
	 * Tests that identical markup with different selectors creates separate records.
	 * This test demonstrates the issue where identical markup is treated as duplicate
	 * even when it appears in different locations on the page.
	 */
	public function testIdenticalMarkupDifferentSelectors() {
		$post     = $this->factory()->post->create_and_get();
		$rule     = 'empty_paragraph_tag';
		$ruletype = 'error';
		$rule_obj = '<p></p>'; // Same markup for both violations.

		global $wpdb;

		$rule_inserter     = new Insert_Rule_Data();
		$initial_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.

		// First violation with selector 1.
		$selectors1 = [
			'selector' => [ '#content p:first-child' ],
			'ancestry' => [ 'html > body > main > #content > p:first-child' ],
			'xpath'    => [ '/html/body/main/div[@id="content"]/p[1]' ],
		];
		$result1    = $rule_inserter->insert( $post, $rule, $ruletype, $rule_obj, null, null, $selectors1 );
		$this->assertIsInt( $result1, 'First violation should be inserted successfully' );

		// Second violation with same markup but different selector.
		$selectors2 = [
			'selector' => [ '#sidebar p:first-child' ],
			'ancestry' => [ 'html > body > aside > #sidebar > p:first-child' ],
			'xpath'    => [ '/html/body/aside/div[@id="sidebar"]/p[1]' ],
		];
		$result2    = $rule_inserter->insert( $post, $rule, $ruletype, $rule_obj, null, null, $selectors2 );
		$this->assertIsInt( $result2, 'Second violation with different selector should also be inserted' );

		// Verify we have two separate records after the fix.
		$current_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.
		$this->assertEquals( $initial_row_count + 2, $current_row_count, 'Should have two separate records for identical markup with different selectors' );
	}

	/**
	 * Tests that truly identical violations (same markup AND same selector) are still deduplicated.
	 */
	public function testTrulyIdenticalViolationsAreDeduplicated() {
		$post     = $this->factory()->post->create_and_get();
		$rule     = 'empty_paragraph_tag';
		$ruletype = 'error';
		$rule_obj = '<p></p>';

		global $wpdb;

		$rule_inserter     = new Insert_Rule_Data();
		$initial_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.

		// Same violation inserted twice - should only create one record.
		$selectors = [
			'selector' => [ '#content p:first-child' ],
			'ancestry' => [ 'html > body > main > #content > p:first-child' ],
			'xpath'    => [ '/html/body/main/div[@id="content"]/p[1]' ],
		];
		
		$result1 = $rule_inserter->insert( $post, $rule, $ruletype, $rule_obj, null, null, $selectors );
		$this->assertIsInt( $result1, 'First violation should be inserted successfully' );

		$result2 = $rule_inserter->insert( $post, $rule, $ruletype, $rule_obj, null, null, $selectors );
		$this->assertEquals( null, $result2, 'Truly identical violation should be treated as duplicate' );

		// Verify we only have one record.
		$current_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.
		$this->assertEquals( $initial_row_count + 1, $current_row_count, 'Should have only one record for truly identical violations' );
	}

	/**
	 * Tests that identical link markup with different selectors creates separate link_improper violations.
	 * This demonstrates the fix working with a different rule type.
	 */
	public function testIdenticalLinksDifferentSelectors() {
		$post     = $this->factory()->post->create_and_get();
		$rule     = 'link_improper';
		$ruletype = 'error';
		$rule_obj = '<a href="#">this is the same link</a>'; // Same markup for both links.

		global $wpdb;

		$rule_inserter     = new Insert_Rule_Data();
		$initial_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.

		// First link violation.
		$selectors1 = [
			'selector' => [ 'a:nth-child(1)' ],
			'ancestry' => [ 'html > body > main > a:nth-child(1)' ],
			'xpath'    => [ '/html/body/main/a[1]' ],
		];
		$result1    = $rule_inserter->insert( $post, $rule, $ruletype, $rule_obj, null, null, $selectors1 );
		$this->assertIsInt( $result1, 'First link violation should be inserted successfully' );

		// Second link violation with same markup but different selector.
		$selectors2 = [
			'selector' => [ 'a:nth-child(2)' ],
			'ancestry' => [ 'html > body > main > a:nth-child(2)' ],
			'xpath'    => [ '/html/body/main/a[2]' ],
		];
		$result2    = $rule_inserter->insert( $post, $rule, $ruletype, $rule_obj, null, null, $selectors2 );
		$this->assertIsInt( $result2, 'Second link violation with different selector should also be inserted' );

		// Verify we have two separate records for the identical links.
		$current_row_count = $wpdb->get_var( "SELECT COUNT(*) FROM $this->table_name" ); // phpcs:ignore WordPress.DB -- caching not required for one time operation.
		$this->assertEquals( $initial_row_count + 2, $current_row_count, 'Should have two separate records for identical links with different selectors' );
	}
}

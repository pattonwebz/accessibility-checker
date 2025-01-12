<?php
/**
 * Class file for Admin enqueueing styles and scripts.
 *
 * @package Accessibility_Checker
 */

namespace EDAC\Admin;

/**
 * Class that initializes and handles enqueueing styles and scripts for the admin.
 */
class Enqueue_Admin {


	/**
	 * Constructor
	 */
	public function __construct() {
	}


	/**
	 * Enqueue the scripts and styles.
	 */
	public static function enqueue() {
		self::enqueue_styles();
		self::maybe_enqueue_admin_and_editor_app_scripts();
		self::maybe_enqueue_email_opt_in_script();
	}

	/**
	 * Enqueue the admin styles.
	 *
	 * @return void
	 */
	public static function enqueue_styles() {
		wp_enqueue_style( 'edac', plugin_dir_url( EDAC_PLUGIN_FILE ) . 'build/css/admin.css', array(), EDAC_VERSION, 'all' );
	}   
	
	/**
	 * Enqueue the admin and editorApp scripts.
	 *
	 * @return void
	 */
	public static function maybe_enqueue_admin_and_editor_app_scripts() {


		global $pagenow;
		$post_types        = get_option( 'edac_post_types' );
		$current_post_type = get_post_type();
		$page              = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : null; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
		$enabled_pages     = array(
			'accessibility_checker',
			'accessibility_checker_settings',
			'accessibility_checker_issues',
			'accessibility_checker_ignored',
		);

		if ( is_array( $post_types ) && count( $post_types ) && ( in_array( $current_post_type, $post_types, true ) || in_array( $page, $enabled_pages, true ) ) || ( 'site-editor.php' !== $pagenow ) ) {

			global $post;
			$post_id = is_object( $post ) ? $post->ID : null;
			wp_enqueue_script( 'edac', plugin_dir_url( EDAC_PLUGIN_FILE ) . 'build/admin.bundle.js', array( 'jquery' ), EDAC_VERSION, false );

		
			wp_localize_script(
				'edac',
				'edac_script_vars',
				array(
					'postID'     => $post_id,
					'nonce'      => wp_create_nonce( 'ajax-nonce' ),
					'edacApiUrl' => esc_url_raw( rest_url() . 'accessibility-checker/v1' ),
					'restNonce'  => wp_create_nonce( 'wp_rest' ),
				)
			);
		

			if ( 'post.php' === $pagenow ) {
		

				// Is this posttype setup to be checked?
				$post_types        = get_option( 'edac_post_types' );
				$current_post_type = get_post_type();
				$active            = ( is_array( $post_types ) && in_array( $current_post_type, $post_types, true ) );
	
				$pro = is_plugin_active( 'accessibility-checker-pro/accessibility-checker-pro.php' ) && EDAC_KEY_VALID;
	
				if ( EDAC_DEBUG || strpos( EDAC_VERSION, '-beta' ) !== false ) {
					$debug = true;
				} else {
					$debug = false;
				}
		
				wp_enqueue_script( 'edac-editor-app', plugin_dir_url( EDAC_PLUGIN_FILE ) . 'build/editorApp.bundle.js', false, EDAC_VERSION, false );
	
				wp_localize_script(
					'edac-editor-app',
					'edac_editor_app',
					array(
						'postID'     => $post_id,
						'edacUrl'    => esc_url_raw( get_site_url() ),
						'edacApiUrl' => esc_url_raw( rest_url() . 'accessibility-checker/v1' ),
						'baseurl'    => plugin_dir_url( __DIR__ ),
						'active'     => $active,
						'pro'        => $pro,
						'authOk'     => false === (bool) get_option( 'edac_password_protected', false ),
						'debug'      => $debug,
						'scanUrl'    => get_preview_post_link(
							$post_id, 
							array( 'edac_pageScanner' => 1 )
						),
					)
				);
	
			}       
		}
	}

	/**
	 * Enqueue the email opt-in script on the welcome page.
	 *
	 * @return void
	 */
	public static function maybe_enqueue_email_opt_in_script() {

		$page = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : null; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
		if ( 'accessibility_checker' === $page 
			&& true !== (bool) get_user_meta( get_current_user_id(), 'edac_email_optin', true ) 
		) {

				wp_enqueue_style( 'email-opt-in-form', plugin_dir_url( EDAC_PLUGIN_FILE ) . 'build/css/emailOptIn.css', false, EDAC_VERSION, 'all' );
				wp_enqueue_script( 'email-opt-in-form', plugin_dir_url( EDAC_PLUGIN_FILE ) . 'build/emailOptIn.bundle.js', false, EDAC_VERSION, true );
		
				wp_localize_script(
					'email-opt-in-form',
					'edac_email_opt_in_form',
					array(
						'nonce'   => wp_create_nonce( 'ajax-nonce' ),
						'ajaxurl' => admin_url( 'admin-ajax.php' ),
					)
				);
	
		}
	}
}

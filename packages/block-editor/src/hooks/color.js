/**
 * External dependencies
 */
import classnames from 'classnames';
import { isObject } from 'lodash';

/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';
import { hasBlockSupport, getBlockSupport } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';
import { useState, useEffect, useRef } from '@wordpress/element';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	getColorClassName,
	getColorObjectByColorValue,
	getColorObjectByAttributeValues,
} from '../components/colors';
import {
	__experimentalGetGradientClass,
	getGradientValueBySlug,
	getGradientSlugByValue,
} from '../components/gradients';
import PanelColorGradientSettings from '../components/colors-gradients/panel-color-gradient-settings';
import ContrastChecker from '../components/contrast-checker';
import InspectorControls from '../components/inspector-controls';
import { getBlockDOMNode } from '../utils/dom';
import { cleanEmptyObject } from './utils';

export const COLOR_SUPPORT_KEY = '__experimentalColor';

const hasColorSupport = ( blockType ) =>
	hasBlockSupport( blockType, COLOR_SUPPORT_KEY );

const hasGradientSupport = ( blockType ) => {
	const colorSupport = getBlockSupport( blockType, COLOR_SUPPORT_KEY );

	return isObject( colorSupport ) && !! colorSupport.gradients;
};

/**
 * Filters registered block settings, extending attributes to include
 * `backgroundColor` and `textColor` attribute.
 *
 * @param  {Object} settings Original block settings
 * @return {Object}          Filtered block settings
 */
function addAttributes( settings ) {
	if ( ! hasColorSupport( settings ) ) {
		return settings;
	}

	// allow blocks to specify their own attribute definition with default values if needed.
	if ( ! settings.attributes.backgroundColor ) {
		Object.assign( settings.attributes, {
			backgroundColor: {
				type: 'string',
			},
		} );
	}
	if ( ! settings.attributes.textColor ) {
		Object.assign( settings.attributes, {
			textColor: {
				type: 'string',
			},
		} );
	}

	if ( hasGradientSupport( settings ) && ! settings.attributes.gradient ) {
		Object.assign( settings.attributes, {
			gradient: {
				type: 'string',
			},
		} );
	}

	return settings;
}

/**
 * Override props assigned to save component to inject colors classnames.
 *
 * @param  {Object} props      Additional props applied to save element
 * @param  {Object} blockType  Block type
 * @param  {Object} attributes Block attributes
 * @return {Object}            Filtered props applied to save element
 */
export function addSaveProps( props, blockType, attributes ) {
	if ( ! hasColorSupport( blockType ) ) {
		return props;
	}

	const hasGradient = hasGradientSupport( blockType );

	// I'd have prefered to avoid the "style" attribute usage here
	const { backgroundColor, textColor, gradient, style } = attributes;

	const backgroundClass = getColorClassName(
		'background-color',
		backgroundColor
	);
	const gradientClass = __experimentalGetGradientClass( gradient );
	const textClass = getColorClassName( 'color', textColor );
	const newClassName = classnames(
		props.className,
		textClass,
		gradientClass,
		{
			// Don't apply the background class if there's a custom gradient
			[ backgroundClass ]:
				( ! hasGradient || ! style?.color?.gradient ) &&
				!! backgroundClass,
			'has-text-color': textColor || style?.color?.text,
			'has-background':
				backgroundColor ||
				style?.color?.background ||
				( hasGradient && ( gradient || style?.color?.gradient ) ),
		}
	);
	props.className = newClassName ? newClassName : undefined;

	return props;
}

/**
 * Filters registered block settings to extand the block edit wrapper
 * to apply the desired styles and classnames properly.
 *
 * @param  {Object} settings Original block settings
 * @return {Object}          Filtered block settings
 */
export function addEditProps( settings ) {
	if ( ! hasColorSupport( settings ) ) {
		return settings;
	}
	const existingGetEditWrapperProps = settings.getEditWrapperProps;
	settings.getEditWrapperProps = ( attributes ) => {
		let props = {};
		if ( existingGetEditWrapperProps ) {
			props = existingGetEditWrapperProps( attributes );
		}
		return addSaveProps( props, settings, attributes );
	};

	return settings;
}

const ColorPanel = ( { settings, clientId } ) => {
	const { getComputedStyle, Node } = window;

	const [ detectedBackgroundColor, setDetectedBackgroundColor ] = useState();
	const [ detectedColor, setDetectedColor ] = useState();

	useEffect( () => {
		const colorsDetectionElement = getBlockDOMNode( clientId );
		if ( ! colorsDetectionElement ) {
			return;
		}
		setDetectedColor( getComputedStyle( colorsDetectionElement ).color );

		let backgroundColorNode = colorsDetectionElement;
		let backgroundColor = getComputedStyle( backgroundColorNode )
			.backgroundColor;
		while (
			backgroundColor === 'rgba(0, 0, 0, 0)' &&
			backgroundColorNode.parentNode &&
			backgroundColorNode.parentNode.nodeType === Node.ELEMENT_NODE
		) {
			backgroundColorNode = backgroundColorNode.parentNode;
			backgroundColor = getComputedStyle( backgroundColorNode )
				.backgroundColor;
		}

		setDetectedBackgroundColor( backgroundColor );
	} );

	return (
		<InspectorControls>
			<PanelColorGradientSettings
				title={ __( 'Color settings' ) }
				initialOpen={ false }
				settings={ settings }
			>
				<ContrastChecker
					backgroundColor={ detectedBackgroundColor }
					textColor={ detectedColor }
				/>
			</PanelColorGradientSettings>
		</InspectorControls>
	);
};

/**
 * Override the default edit UI to include new inspector controls for block
 * color, if block defines support.
 *
 * @param  {Function} BlockEdit Original component
 * @return {Function}           Wrapped component
 */
export const withBlockControls = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		const { name: blockName, attributes } = props;
		const { colors, gradients } = useSelect( ( select ) => {
			return select( 'core/block-editor' ).getSettings();
		}, [] );
		// Shouldn't be needed but right now the ColorGradientsPanel
		// can trigger both onChangeColor and onChangeBackground
		// synchronously causing our two callbacks to override changes
		// from each other.
		const localAttributes = useRef( attributes );
		useEffect( () => {
			localAttributes.current = attributes;
		} );

		if ( ! hasColorSupport( blockName ) ) {
			return <BlockEdit key="edit" { ...props } />;
		}

		const hasGradient = hasGradientSupport( blockName );

		const { style, textColor, backgroundColor, gradient } = attributes;
		let gradientValue;
		if ( hasGradient && gradient ) {
			gradientValue = getGradientValueBySlug( gradients, gradient );
		} else if ( hasGradient ) {
			gradientValue = style?.color?.gradient;
		}

		const onChangeColor = ( name ) => ( value ) => {
			const colorObject = getColorObjectByColorValue( colors, value );
			const attributeName = name + 'Color';
			const newStyle = {
				...localAttributes.current.style,
				color: {
					...localAttributes.current?.style?.color,
					[ name ]: colorObject?.slug ? undefined : value,
				},
			};
			const newNamedColor = colorObject?.slug
				? colorObject.slug
				: undefined;
			const newAttributes = {
				style: cleanEmptyObject( newStyle ),
				[ attributeName ]: newNamedColor,
			};

			props.setAttributes( newAttributes );
			localAttributes.current = {
				...localAttributes.current,
				...newAttributes,
			};
		};

		const onChangeGradient = ( value ) => {
			const slug = getGradientSlugByValue( gradients, value );
			let newAttributes;
			if ( slug ) {
				const newStyle = {
					...localAttributes.current?.style,
					color: {
						...localAttributes.current?.style?.color,
						gradient: undefined,
					},
				};
				newAttributes = {
					style: cleanEmptyObject( newStyle ),
					gradient: slug,
				};
			} else {
				const newStyle = {
					...localAttributes.current?.style,
					color: {
						...localAttributes.current?.style?.color,
						gradient: value,
					},
				};
				newAttributes = {
					style: cleanEmptyObject( newStyle ),
					gradient: undefined,
				};
			}
			props.setAttributes( newAttributes );
			localAttributes.current = {
				...localAttributes.current,
				...newAttributes,
			};
		};

		return [
			<ColorPanel
				key="colors"
				clientId={ props.clientId }
				settings={ [
					{
						label: __( 'Text Color' ),
						onColorChange: onChangeColor( 'text' ),
						colorValue: getColorObjectByAttributeValues(
							colors,
							textColor,
							style?.color?.text
						).color,
					},
					{
						label: __( 'Background Color' ),
						onColorChange: onChangeColor( 'background' ),
						colorValue: getColorObjectByAttributeValues(
							colors,
							backgroundColor,
							style?.color?.background
						).color,
						gradientValue,
						onGradientChange: hasGradient
							? onChangeGradient
							: undefined,
					},
				] }
			/>,
			<BlockEdit key="edit" { ...props } />,
		];
	},
	'withToolbarControls'
);

addFilter(
	'blocks.registerBlockType',
	'core/color/addAttribute',
	addAttributes
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'core/color/addSaveProps',
	addSaveProps
);

addFilter(
	'blocks.registerBlockType',
	'core/color/addEditProps',
	addEditProps
);

addFilter(
	'editor.BlockEdit',
	'core/color/with-block-controls',
	withBlockControls
);

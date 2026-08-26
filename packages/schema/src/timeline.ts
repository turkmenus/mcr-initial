import { z } from "zod";

/**
 * Keyframe for dynamic property interpolation (OpenCut Animation Model)
 */
export const KeyframeSchema = z.object({
  id: z.string(),
  timeOffset: z.number(), // seconds relative to clip.start
  x: z.number().optional(),
  y: z.number().optional(),
  scale: z.number().optional(),
  rotation: z.number().optional(),
  opacity: z.number().optional(),
  volume: z.number().optional(),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]).default("linear"),
});
export type ClipKeyframe = z.infer<typeof KeyframeSchema>;

/**
 * Timeline Clip Base
 */
export const ClipBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  start: z.number(), // timeline start time in seconds
  duration: z.number(), // duration on timeline in seconds
  offset: z.number().optional(), // start offset in source media in seconds
  speed: z.number().optional(), // playback speed multiplier (e.g. 0.5x, 1.0x, 2.0x)
  trimStart: z.number().optional(), // in-point in source media in seconds (OpenCut 4-point timing)
  trimEnd: z.number().optional(), // out-point in source media in seconds
  sourceDuration: z.number().optional(), // total source media duration in seconds
  intrinsicWidth: z.number().optional(), // native width of media element
  intrinsicHeight: z.number().optional(), // native height of media element
  color: z.string().optional(),
  keyframes: z.array(KeyframeSchema).optional(),
});

/**
 * Video Clip
 */
export const VideoClipSchema = ClipBaseSchema.extend({
  type: z.literal("video"),
  src: z.string(),
  volume: z.number().optional(),
  speed: z.number().optional(),
  thumbnail: z.string().optional(),
  scale: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  opacity: z.number().optional(),
  brightness: z.number().optional(),
  contrast: z.number().optional(),
  saturation: z.number().optional(),
  blur: z.number().optional(),
  transitionIn: z.enum(["none", "fade", "slide-left", "slide-right", "zoom", "wipe"]).optional(),
  transitionInDuration: z.number().optional(),
  transitionOut: z.enum(["none", "fade", "slide-left", "slide-right", "zoom", "wipe"]).optional(),
  transitionOutDuration: z.number().optional(),
});
export type VideoClip = z.infer<typeof VideoClipSchema>;

/**
 * Audio Clip
 */
export const AudioClipSchema = ClipBaseSchema.extend({
  type: z.literal("audio"),
  src: z.string(),
  volume: z.number().optional(),
  fadeIn: z.number().optional(),
  fadeOut: z.number().optional(),
  pan: z.number().optional(), // -1 (left) to 1 (right)
  muted: z.boolean().optional(),
});
export type AudioClip = z.infer<typeof AudioClipSchema>;

/**
 * Graphics Overlay Clip (OGraf Template embedded on timeline)
 */
export const GraphicsOverlayClipSchema = ClipBaseSchema.extend({
  type: z.literal("graphics"),
  templateId: z.string(),
  data: z.record(z.any()).default({}),
  inDuration: z.number().optional(),
  outDuration: z.number().optional(),
});
export type GraphicsOverlayClip = z.infer<typeof GraphicsOverlayClipSchema>;

/**
 * Text / Title Clip
 */
export const TextClipSchema = ClipBaseSchema.extend({
  type: z.literal("text"),
  text: z.string().default("Haber Başlığı"),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.string().optional(),
  textColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  scale: z.number().optional(),
  opacity: z.number().optional(),
  animationIn: z.enum(["none", "fade", "slide-up", "slide-down", "typewriter"]).optional(),
  animationOut: z.enum(["none", "fade", "slide-up", "slide-down"]).optional(),
});
export type TextClip = z.infer<typeof TextClipSchema>;

/**
 * Image / B-Roll Still Clip
 */
export const ImageClipSchema = ClipBaseSchema.extend({
  type: z.literal("image"),
  src: z.string(),
  scale: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  opacity: z.number().optional(),
  brightness: z.number().optional(),
  contrast: z.number().optional(),
  saturation: z.number().optional(),
  blur: z.number().optional(),
  transitionIn: z.enum(["none", "fade", "slide-left", "slide-right", "zoom", "wipe"]).optional(),
  transitionInDuration: z.number().optional(),
  transitionOut: z.enum(["none", "fade", "slide-left", "slide-right", "zoom", "wipe"]).optional(),
  transitionOutDuration: z.number().optional(),
});
export type ImageClip = z.infer<typeof ImageClipSchema>;

export type TimelineClip = VideoClip | AudioClip | GraphicsOverlayClip | TextClip | ImageClip;

/**
 * Timeline Track
 */
export const TrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["video", "audio", "graphics", "text"]),
  muted: z.boolean().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  zIndex: z.number().optional(),
  clips: z.array(z.union([
    VideoClipSchema,
    AudioClipSchema,
    GraphicsOverlayClipSchema,
    TextClipSchema,
    ImageClipSchema,
  ])),
});
export type Track = z.infer<typeof TrackSchema>;

/**
 * Timeline Marker
 */
export const MarkerSchema = z.object({
  id: z.string(),
  time: z.number(),
  label: z.string(),
  color: z.string().optional(),
});
export type Marker = z.infer<typeof MarkerSchema>;

/**
 * Timeline Project (EDL)
 */
export const TimelineProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  fps: z.number().optional(),
  duration: z.number().optional(), // max duration in seconds
  tracks: z.array(TrackSchema).default([]),
  markers: z.array(MarkerSchema).optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type TimelineProject = z.infer<typeof TimelineProjectSchema>;

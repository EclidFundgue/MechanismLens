# Script

Generated from `visual-intent.json`. Do not edit this copy.

## Start with the paper's real contribution `scene.overview`

### The problem `step.problem`

Replace this sentence with the problem the paper actually solves.

### The contribution `step.contribution`

Replace this sentence with the paper's primary contribution.

## Build the representation `scene.encoder`

### Encoder input `step.encoder-input`

First identify the tensor entering the encoder and the projection applied to it.

### Encoded state `step.encoder-context`

Then keep the frame fixed while the context blocks produce the encoded representation.

## Combine the evidence `scene.fusion`

### Fusion inputs `step.fusion-inputs`

Read both source streams together before applying the fusion operation.

### Fusion output `step.fusion-output`

The reserved detail area can expand the mechanism without moving or resizing the main diagram.

## Recover the output `scene.decoder`

### Decoder path `step.decoder`

The decoder transforms the fused representation into the paper's output in one readable frame.

## Connect the complete method `scene.architecture-summary`

### End-to-end path `step.architecture-summary`

Now connect the encoder, fusion and decoder after each part has already been learned.

## Unfold the main equation `scene.equation`

### step.primary-loss `step.primary-loss`

The first term captures the primary prediction error.

### step.regularizer `step.regularizer`

The weighted second term controls the regularization objective.

## Trace the algorithm state `scene.algorithm`

### step.initialize `step.initialize`

First initialize the state from the current observation.

### step.update `step.update`

Then update the state until the stopping condition is reached.

## Which component actually helps? `scene.ablation`

### step.baseline `step.baseline`

The baseline establishes the comparison point.

### step.full `step.full`

The full method shows the total reported improvement on the same scale.

## Inspect the paper's qualitative evidence `scene.figure`

### step.region-input `step.region-input`

Inspect the first region because its original annotation is too small in the complete figure.

### step.region-output `step.region-output`

After restoring spatial context, inspect the second region before accepting the conclusion.

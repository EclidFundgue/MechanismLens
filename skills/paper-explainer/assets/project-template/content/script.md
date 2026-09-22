# Script

Generated from `visual-intent.json`. Do not edit this copy.

## Start with the paper's real contribution `scene.overview`

### The problem `step.problem`

Replace this sentence with the problem the paper actually solves.

### The contribution `step.contribution`

Replace this sentence with the paper's primary contribution.

## Move through one stable architecture `scene.architecture`

### Whole model `step.architecture-overview`

Start from the complete model so every later detail has a stable place.

### Encoder `step.encoder`

Move into the encoder while keeping the rest of the model as context.

### Fusion `step.fusion`

The fusion stage combines the representations produced upstream.

### Inside fusion `step.fusion-detail`

A detail view expands the mechanism without losing its location in the whole model.

### Decoder `step.decoder`

The camera first restores context, then moves into the decoder.

### Return to the whole `step.architecture-return`

Return to the complete architecture and trace the end-to-end path once more.

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

The full method shows the total reported improvement.

## Inspect the paper's qualitative evidence `scene.figure`

### step.region-input `step.region-input`

Focus on the first region that supports the qualitative claim.

### step.region-output `step.region-output`

Compare it with the second region before accepting the conclusion.

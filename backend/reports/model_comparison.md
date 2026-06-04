# Model Comparison

## Regression Models (CLV Prediction)
| model                     |       r2 |     mae |    rmse |     mape |
|:--------------------------|---------:|--------:|--------:|---------:|
| Ridge                     | 0.999944 | 110.917 | 155.058 |  6.03604 |
| LinearRegression          | 0.999944 | 110.91  | 155.058 |  6.0938  |
| Lasso                     | 0.999943 | 112.305 | 156.99  |  8.51516 |
| GradientBoostingRegressor | 0.99953  | 171.553 | 449.026 | 25.5916  |
| RandomForestRegressor     | 0.999426 | 144.446 | 496.103 | 13.5444  |

## Classification Models (High-Value Identification)
| model                      |   accuracy |   precision |   recall |       f1 |   roc_auc |
|:---------------------------|-----------:|------------:|---------:|---------:|----------:|
| GradientBoostingClassifier |     0.9771 |    0.939454 |   0.9465 | 0.942964 |  0.997235 |
| RandomForestClassifier     |     0.9758 |    0.93558  |   0.944  | 0.939771 |  0.996843 |
| LogisticRegression         |     0.9758 |    0.940822 |   0.938  | 0.939409 |  0.995878 |

## Final Model Selection Rationale
- Selected regression model: **Ridge** based on strongest R2 with competitive MAE/RMSE stability.
- Selected classification model: **GradientBoostingClassifier** based on best F1 and recall balance for premium-customer capture.
- Selection prioritized business utility: high-value customer miss rate was treated as costly, so recall and F1 were emphasized.